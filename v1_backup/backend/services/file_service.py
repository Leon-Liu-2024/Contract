import os
import uuid
import aiofiles
from fastapi import UploadFile
from config import UPLOAD_DIR

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".png", ".jpg", ".jpeg"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB


async def save_upload(file: UploadFile, contract_id: int) -> dict:
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不支援的檔案格式: {ext}")

    contract_dir = os.path.join(UPLOAD_DIR, str(contract_id))
    os.makedirs(contract_dir, exist_ok=True)

    stored_name = f"{uuid.uuid4().hex}{ext}"
    stored_path = os.path.join(contract_dir, stored_name)

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("檔案大小超過 20MB 上限")

    async with aiofiles.open(stored_path, "wb") as f:
        await f.write(content)

    return {
        "filename": file.filename,
        "stored_path": stored_path,
        "file_size": len(content),
    }


def get_file_path(stored_path: str) -> str | None:
    if os.path.exists(stored_path):
        return stored_path
    return None
