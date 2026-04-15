import os
import aiofiles
from fastapi import UploadFile
from config import UPLOAD_DIR

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".jpg", ".png", ".zip", ".msg"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB


async def save_upload(contract_id: int, file: UploadFile) -> dict:
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"不允許的檔案格式: {ext}")

    dir_path = os.path.join(UPLOAD_DIR, str(contract_id))
    os.makedirs(dir_path, exist_ok=True)

    file_path = os.path.join(dir_path, file.filename)
    size = 0
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(8192):
            size += len(chunk)
            if size > MAX_FILE_SIZE:
                os.remove(file_path)
                raise ValueError("檔案大小超過 50MB")
            await f.write(chunk)

    return {"file_path": file_path, "file_size": size}


def get_file_path(contract_id: int, filename: str) -> str | None:
    path = os.path.join(UPLOAD_DIR, str(contract_id), filename)
    return path if os.path.exists(path) else None
