from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import auth, documents, settings, upload

settings_obj = get_settings()

# MongoDB is schemaless — the `users` collection and its unique email
# index are created on import in database.py, nothing to do here.

app = FastAPI(
    title=settings_obj.app_name,
    description="Backend API for the Document Intelligence Platform — serves the DocIntel frontend.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings_obj.frontend_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(upload.router)
app.include_router(settings.router)


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "databricks_configured": settings_obj.is_databricks_configured,
    }
