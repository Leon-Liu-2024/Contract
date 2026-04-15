#!/usr/bin/env python3
"""
FORMTEXT 表單欄位填寫工具
用於填寫 ibon 制式合約範本的 Word Form 欄位

用法（命令列）：
    python fill_formtext.py template.docx output.docx '{"1":"值1","2":"值2"}'

用法（Python 呼叫）：
    from services.fill_formtext import fill_formtext_fields
    fill_formtext_fields("template.docx", "output.docx", {"1": "ABC-001", "47": "台灣公司"})
"""

import re
import zipfile
import json
import sys
import shutil
import os


def fill_formtext_fields(docx_in: str, docx_out: str, fields: dict) -> None:
    """
    填寫 Word 文件中的 FORMTEXT 表單欄位。

    Args:
        docx_in:  來源範本路徑（.docx）
        docx_out: 輸出檔案路徑（.docx）
        fields:   欄位對應字典，key 為欄位序號（字串，從 1 開始），value 為填寫值
                  例：{"1": "AGR-2025-001", "47": "台灣股份有限公司"}
    """
    # 複製範本
    shutil.copy2(docx_in, docx_out)
    os.chmod(docx_out, 0o644)

    # 讀取所有 ZIP 內容
    with zipfile.ZipFile(docx_out, "r") as z:
        files = {n: z.read(n) for n in z.namelist()}

    doc = files["word/document.xml"].decode("utf-8")

    # 找出所有 FORMTEXT 欄位的位置（依序）
    formtext_positions = [m.start() for m in re.finditer(r"FORMTEXT", doc)]

    # 由後往前替換，避免字串偏移
    replacements = []
    for pos_str, value in fields.items():
        pos = int(pos_str)
        if 1 <= pos <= len(formtext_positions):
            replacements.append((formtext_positions[pos - 1], str(value)))

    replacements.sort(key=lambda x: x[0], reverse=True)

    for ft_pos, value in replacements:
        seg_end = doc.find('fldCharType="end"', ft_pos)
        if seg_end < 0:
            continue

        sep_idx = doc.find('fldCharType="separate"', ft_pos, seg_end)
        if sep_idx < 0:
            continue
        sep_close = doc.find("/>", sep_idx) + 2

        wt_start = doc.find("<w:t", sep_close)
        if wt_start < 0 or wt_start > seg_end:
            continue
        wt_end = doc.find("</w:t>", wt_start)
        if wt_end < 0 or wt_end > seg_end:
            continue
        wt_end += 6

        # XML 字元跳脫
        escaped = value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        new_wt = f'<w:t xml:space="preserve">{escaped}</w:t>'
        doc = doc[:wt_start] + new_wt + doc[wt_end:]

    files["word/document.xml"] = doc.encode("utf-8")

    with zipfile.ZipFile(docx_out, "w", zipfile.ZIP_DEFLATED) as z:
        for n, d in files.items():
            z.writestr(n, d)


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("用法: fill_formtext.py template.docx output.docx '{\"1\":\"值1\"}'")
        sys.exit(1)
    fill_formtext_fields(sys.argv[1], sys.argv[2], json.loads(sys.argv[3]))
    print(f"✅ 完成：{sys.argv[2]}")
