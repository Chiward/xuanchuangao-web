from fastapi import FastAPI, UploadFile, File, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import jwt
import hashlib
import os
from supabase import create_client, Client
from dotenv import load_dotenv

_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".env.local"))
load_dotenv(_env_path)

# Import internal modules
try:
    from api.parser import extract_text_from_file
    from api.generator import build_prompt, stream_generate, rewrite_text
except ImportError:
    from parser import extract_text_from_file
    from generator import build_prompt, stream_generate, rewrite_text

app = FastAPI()

# Configuration
SECRET_KEY = (
    os.environ.get("ADMIN_JWT_SECRET")
    or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
)
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # Needed for admin ops

# Initialize Supabase Client
admin_sb: Optional[Client] = None
if SUPABASE_URL and (SERVICE_ROLE_KEY or SUPABASE_KEY):
    admin_sb = create_client(SUPABASE_URL, SERVICE_ROLE_KEY or SUPABASE_KEY)

# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str

class AdminLogin(BaseModel):
    username: str
    password: str

class CreditUpdate(BaseModel):
    credits: int

class StatusUpdate(BaseModel):
    status: str

class FeedbackReadUpdate(BaseModel):
    is_read: bool

# --- Public API Models ---
class GenerateRequest(BaseModel):
    template_type: str
    form_data: Dict[str, Any]
    context_text: Optional[str] = ""

class RewriteRequest(BaseModel):
    text: str
    command: str
    context_before: Optional[str] = ""
    context_after: Optional[str] = ""

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Helper Functions ---

def verify_password(plain_password, hashed_password):
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

def verify_password_salted(plain_password: str, hashed_password: str, salt: Optional[str]) -> bool:
    if salt:
        return hashlib.sha256((salt + plain_password).encode()).hexdigest() == hashed_password
    return verify_password(plain_password, hashed_password)

def ensure_admin_configured():
    if not SECRET_KEY:
        raise HTTPException(status_code=500, detail="Admin JWT secret missing: set ADMIN_JWT_SECRET")
    if not SUPABASE_URL:
        raise HTTPException(status_code=500, detail="Supabase config missing: set NEXT_PUBLIC_SUPABASE_URL")
    if not SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=500,
            detail="Admin backend requires SUPABASE_SERVICE_ROLE_KEY (Service Role) to access admins/audit logs",
        )
    if not admin_sb:
        raise HTTPException(status_code=500, detail="Supabase client init failed")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _get_bearer_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing admin token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return auth.replace("Bearer ", "", 1).strip()

async def get_current_admin(request: Request):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = _get_bearer_token(request)
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.PyJWTError:
        raise credentials_exception
    return username

async def log_admin_action(admin_username: str, action: str, details: dict = None, target_user_id: str = None):
    try:
        if not admin_sb:
            return
        admin_sb.table("audit_logs").insert({
            "admin_username": admin_username,
            "action": action,
            "details": details,
            "target_user_id": target_user_id
        }).execute()
    except Exception as e:
        print(f"Failed to log action: {e}")

# --- Admin Routes ---

@app.post("/api/admin/login", response_model=Token)
async def admin_login(payload: AdminLogin):
    ensure_admin_configured()
    # Query admin table
    res = admin_sb.table("admins").select("username,password_hash,password_salt").eq("username", payload.username).single().execute()
    if getattr(res, "error", None) and "password_salt" in str(res.error):
        res = admin_sb.table("admins").select("username,password_hash").eq("username", payload.username).single().execute()
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=f"Admin auth query failed: {res.error}")
    admin = res.data or {}
    admin.setdefault("password_salt", None)
    
    if not admin or not verify_password_salted(payload.password, admin.get("password_hash", ""), admin.get("password_salt")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not admin.get("password_salt"):
        new_salt = os.urandom(16).hex()
        new_hash = hashlib.sha256((new_salt + payload.password).encode()).hexdigest()
        admin_sb.table("admins").update({"password_salt": new_salt, "password_hash": new_hash}).eq("username", admin["username"]).execute()
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin['username']}, expires_delta=access_token_expires
    )
    
    await log_admin_action(admin['username'], "login")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/admin/users")
async def get_users(
    page: int = 0, 
    limit: int = 10, 
    query: str = "", 
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    # Fetch profiles with pagination
    # Note: Supabase Python client pagination syntax
    db_query = admin_sb.table("profiles").select("*", count="exact")
    
    if query:
        # Simple search on ID or other fields if available
        # profiles table usually has id, updated_at, username, etc.
        # Assuming we might have username or email in profiles or we join with auth.users (complex via API)
        # For now, search by ID if it's a UUID, or just list all
        pass

    start = page * limit
    end = start + limit - 1
    res = db_query.range(start, end).execute()
    
    return {"data": res.data, "count": res.count}

@app.put("/api/admin/users/{user_id}/credits")
async def update_user_credits(
    user_id: str, 
    credit_data: CreditUpdate, 
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    res = admin_sb.table("profiles").update({"credits": credit_data.credits}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_admin_action(admin, "update_credits", {"new_credits": credit_data.credits}, user_id)
    return res.data[0]

@app.put("/api/admin/users/{user_id}/status")
async def update_user_status(
    user_id: str, 
    status_data: StatusUpdate, 
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    res = admin_sb.table("profiles").update({"status": status_data.status}).eq("id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="User not found")
    
    await log_admin_action(admin, "update_status", {"new_status": status_data.status}, user_id)
    return res.data[0]

@app.get("/api/admin/history")
async def get_all_history(
    page: int = 0, 
    limit: int = 10, 
    user_id: Optional[str] = None,
    template_type: Optional[str] = None,
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    query = admin_sb.table("generation_history").select("*", count="exact").order("created_at", desc=True)
    
    if user_id:
        query = query.eq("user_id", user_id)
    if template_type:
        query = query.eq("template_type", template_type)
        
    start = page * limit
    end = start + limit - 1
    res = query.range(start, end).execute()
    
    return {"data": res.data, "count": res.count}

@app.get("/api/admin/audit")
async def get_audit_logs(
    page: int = 0, 
    limit: int = 20, 
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    start = page * limit
    end = start + limit - 1
    res = admin_sb.table("audit_logs").select("*", count="exact").order("created_at", desc=True).range(start, end).execute()
    return {"data": res.data, "count": res.count}

@app.get("/api/admin/stats")
async def get_admin_stats(
    days: int = 30,
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    
    # Calculate start date
    start_date = (datetime.utcnow() - timedelta(days=days)).isoformat()
    
    # Query history created after start_date
    res = admin_sb.table("generation_history") \
        .select("created_at") \
        .gte("created_at", start_date) \
        .execute()
        
    # Aggregate counts by date in Python (since standard Supabase REST doesn't support group by easily)
    stats = {}
    for item in res.data:
        # Extract YYYY-MM-DD
        date_str = item["created_at"][:10]
        stats[date_str] = stats.get(date_str, 0) + 1
        
    # Fill in missing dates with 0
    result = []
    current = datetime.utcnow() - timedelta(days=days)
    for _ in range(days + 1):
        d_str = current.strftime("%Y-%m-%d")
        result.append({
            "date": d_str,
            "count": stats.get(d_str, 0)
        })
        current += timedelta(days=1)
        
    return result

# --- Feedback Routes ---

@app.get("/api/admin/feedback")
async def get_feedback(
    page: int = 0,
    limit: int = 10,
    status: Optional[str] = None,
    is_read: Optional[bool] = None,
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    query = admin_sb.table("feedback").select("*", count="exact").order("created_at", desc=True)
    
    if status:
        query = query.eq("status", status)
    if is_read is not None:
        query = query.eq("is_read", is_read)
        
    start = page * limit
    end = start + limit - 1
    res = query.range(start, end).execute()
    
    feedbacks = res.data
    if feedbacks:
        user_ids = list(set(f["user_id"] for f in feedbacks if f.get("user_id")))
        if user_ids:
            try:
                users_res = admin_sb.table("profiles").select("id,username,full_name").in_("id", user_ids).execute()
                users_map = {u["id"]: u for u in users_res.data}
                
                for f in feedbacks:
                    u = users_map.get(f["user_id"])
                    if u:
                        f["username"] = u.get("username")
                        f["full_name"] = u.get("full_name")
            except Exception as e:
                print(f"Error fetching user details: {e}")

        try:
            auth = getattr(admin_sb, "auth", None)
            auth_admin = getattr(auth, "admin", None) if auth else None
            get_user_fn = None
            if auth_admin:
                get_user_fn = getattr(auth_admin, "get_user_by_id", None) or getattr(auth_admin, "get_user", None)
            if get_user_fn:
                for f in feedbacks:
                    if f.get("username") or f.get("full_name") or not f.get("user_id"):
                        continue
                    try:
                        resp = get_user_fn(f["user_id"])
                        user_obj = getattr(resp, "user", None) or getattr(resp, "data", None) or resp
                        if isinstance(user_obj, dict):
                            meta = user_obj.get("user_metadata") or {}
                        else:
                            meta = getattr(user_obj, "user_metadata", None) or {}
                        if isinstance(meta, dict):
                            f["username"] = meta.get("username") or meta.get("name")
                    except Exception:
                        pass
        except Exception:
            pass
    
    return {"data": feedbacks, "count": res.count}

@app.get("/api/admin/feedback/unread-count")
async def get_feedback_unread_count(admin: str = Depends(get_current_admin)):
    ensure_admin_configured()
    # Use head=True to just get count without data if supported, but select("id", count="exact") is fine
    res = admin_sb.table("feedback").select("id", count="exact").eq("is_read", False).execute()
    return {"count": res.count}

@app.put("/api/admin/feedback/{feedback_id}/read")
async def mark_feedback_read(
    feedback_id: str,
    update: FeedbackReadUpdate,
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    res = admin_sb.table("feedback").update({"is_read": update.is_read}).eq("id", feedback_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Feedback not found")
    return res.data[0]

@app.put("/api/admin/feedback/{feedback_id}/status")
async def update_feedback_status(
    feedback_id: str,
    update: StatusUpdate,
    admin: str = Depends(get_current_admin)
):
    ensure_admin_configured()
    res = admin_sb.table("feedback").update({"status": update.status}).eq("id", feedback_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    await log_admin_action(admin, "update_feedback_status", {"id": feedback_id, "status": update.status})
    return res.data[0]

# --- Template Models ---
class Template(BaseModel):
    key: str
    name: str
    description: str
    prompt_template: str
    form_config: List[Dict[str, Any]]
    example_content: Optional[str] = ""
    status: Optional[str] = "active"

# --- Template Management Routes ---

@app.get("/api/admin/templates")
async def get_templates(admin: str = Depends(get_current_admin)):
    ensure_admin_configured()
    res = admin_sb.table("templates").select("*").order("created_at", desc=True).execute()
    return res.data

@app.post("/api/admin/templates")
async def create_template(template: Template, admin: str = Depends(get_current_admin)):
    ensure_admin_configured()
    res = admin_sb.table("templates").insert(template.dict()).execute()
    if getattr(res, "error", None):
        raise HTTPException(status_code=500, detail=f"Failed to create template: {res.error}")
    
    await log_admin_action(admin, "create_template", {"key": template.key, "name": template.name})
    return res.data[0]

@app.put("/api/admin/templates/{template_id}")
async def update_template(template_id: str, template: Template, admin: str = Depends(get_current_admin)):
    ensure_admin_configured()
    # Exclude key from update if you want to keep it immutable, but here we allow update
    # Note: If key is updated, frontend routing might break if not handled carefully
    data = template.dict()
    data["updated_at"] = datetime.utcnow().isoformat()
    
    res = admin_sb.table("templates").update(data).eq("id", template_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Template not found")
        
    await log_admin_action(admin, "update_template", {"id": template_id, "name": template.name})
    return res.data[0]

@app.delete("/api/admin/templates/{template_id}")
async def delete_template(template_id: str, admin: str = Depends(get_current_admin)):
    ensure_admin_configured()
    res = admin_sb.table("templates").delete().eq("id", template_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Template not found")
        
    await log_admin_action(admin, "delete_template", {"id": template_id})
    return {"success": True}

@app.get("/api/templates")
async def get_public_templates():
    # Public endpoint for frontend to fetch active templates
    # If no Supabase client configured (unlikely in prod), return empty list or fallback?
    # We should have admin_sb initialized if env vars are present. 
    # If using anon key, we need to ensure RLS allows select.
    # Our init script: "create policy "Templates are viewable by everyone" on public.templates for select using (true);"
    
    client = admin_sb # Use the initialized client (could be service role or anon depending on config)
    if not client:
        # Try to init a public client if admin_sb failed (e.g. missing service key but has anon key)
        if SUPABASE_URL and SUPABASE_KEY:
            client = create_client(SUPABASE_URL, SUPABASE_KEY)
        else:
            return []
            
    res = client.table("templates").select("key,name,description,form_config").eq("status", "active").order("created_at", desc=False).execute()
    return res.data

# --- Original Routes ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Python Serverless API is running"}

@app.post("/api/parse")
async def parse_file(file: UploadFile = File(...)):
    try:
        text = await extract_text_from_file(file)
        return {"filename": file.filename, "content": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/generate")
async def generate(request: GenerateRequest, req: Request):
    prompt = build_prompt(request.template_type, request.form_data, request.context_text)
    
    return StreamingResponse(
        stream_generate(prompt),
        media_type="text/event-stream"
    )

@app.post("/api/rewrite")
async def rewrite(request: RewriteRequest):
    return StreamingResponse(
        rewrite_text(request.text, request.command, request.context_before, request.context_after),
        media_type="text/event-stream"
    )
