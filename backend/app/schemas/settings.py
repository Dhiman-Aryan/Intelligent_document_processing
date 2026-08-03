from typing import Literal, Optional

from pydantic import BaseModel


class DatabricksConnectionRequest(BaseModel):
    workspace_url: str
    http_path: str
    token: str
    catalog: str = "cdac-project"


class DatabricksConnectionResult(BaseModel):
    connected: bool
    message: str
    catalog: str | None = None


class PipelineScheduleInfo(BaseModel):
    mode: Literal["manual", "scheduled"]
    interval_minutes: Optional[int] = None


class PipelineScheduleRequest(BaseModel):
    mode: Literal["manual", "scheduled"]
    interval_minutes: Optional[int] = None


class RunPipelineResult(BaseModel):
    run_id: Optional[str] = None
    status: Literal["started", "already_running"]
    message: str
