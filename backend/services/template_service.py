"""
ibon 制式合約範本服務
負責範本選擇、欄位對應、合約產生與儲存
"""

import os
import uuid
from datetime import date
from typing import Optional
from services.fill_formtext import fill_formtext_fields

# 範本根目錄
TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "ibon")

# ──────────────────────────────────────────────
# ibon 制式合約範本定義
# ──────────────────────────────────────────────
IBON_TEMPLATES = {
    # ── ibon 服務交易 主約 ──
    "ibon_main_a":        {
        "label": "ibon服務交易 主約A（一般）",
        "file":  "制式_ibon服務交易_主約A_一般_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年(西元)",       "required": True, "hint": "例：2025"},
            "4":  {"label": "合約起始月",             "required": True, "hint": "例：01"},
            "5":  {"label": "合約起始日",             "required": True, "hint": "例：01"},
            "6":  {"label": "合約起始時",             "required": False, "hint": "例：00"},
            "7":  {"label": "合約起始分",             "required": False, "hint": "例：00"},
            "8":  {"label": "合約結束年(西元)",       "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False, "hint": "例：23"},
            "12": {"label": "合約結束分",             "required": False, "hint": "例：59"},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",            "required": True},
            "17": {"label": "統一編號",          "required": True},
            "18": {"label": "地址",              "required": True},
            "19": {"label": "簽約年(西元)",      "required": True},
            "20": {"label": "簽約月",            "required": True},
            "21": {"label": "簽約日",            "required": True},
        },
    },
    "ibon_main_a1": {
        "label": "ibon服務交易 主約A1（第三方金流專用）",
        "file":  "制式_ibon服務交易_主約A1_一般(第三方金流專用)_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年",             "required": True},
            "4":  {"label": "合約起始月",             "required": True},
            "5":  {"label": "合約起始日",             "required": True},
            "6":  {"label": "合約起始時",             "required": False},
            "7":  {"label": "合約起始分",             "required": False},
            "8":  {"label": "合約結束年",             "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False},
            "12": {"label": "合約結束分",             "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",         "required": True},
            "17": {"label": "統一編號",       "required": True},
            "18": {"label": "地址",           "required": True},
            "19": {"label": "簽約年",         "required": True},
            "20": {"label": "簽約月",         "required": True},
            "21": {"label": "簽約日",         "required": True},
        },
    },
    "ibon_main_b": {
        "label": "ibon服務交易 主約B（票券）",
        "file":  "制式_ibon服務交易_主約B_票券_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年",             "required": True},
            "4":  {"label": "合約起始月",             "required": True},
            "5":  {"label": "合約起始日",             "required": True},
            "6":  {"label": "合約起始時",             "required": False},
            "7":  {"label": "合約起始分",             "required": False},
            "8":  {"label": "合約結束年",             "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False},
            "12": {"label": "合約結束分",             "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",         "required": True},
            "17": {"label": "統一編號",       "required": True},
            "18": {"label": "地址",           "required": True},
            "19": {"label": "簽約年",         "required": True},
            "20": {"label": "簽約月",         "required": True},
            "21": {"label": "簽約日",         "required": True},
        },
    },
    "ibon_main_b1": {
        "label": "ibon服務交易 主約B1（票券非連線）",
        "file":  "制式_ibon服務交易_主約B1_票券(非連線)_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年",             "required": True},
            "4":  {"label": "合約起始月",             "required": True},
            "5":  {"label": "合約起始日",             "required": True},
            "6":  {"label": "合約起始時",             "required": False},
            "7":  {"label": "合約起始分",             "required": False},
            "8":  {"label": "合約結束年",             "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False},
            "12": {"label": "合約結束分",             "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",         "required": True},
            "17": {"label": "統一編號",       "required": True},
            "18": {"label": "地址",           "required": True},
            "19": {"label": "簽約年",         "required": True},
            "20": {"label": "簽約月",         "required": True},
            "21": {"label": "簽約日",         "required": True},
        },
    },
    "ibon_main_c": {
        "label": "ibon服務交易 主約C（紅利）",
        "file":  "制式_ibon服務交易_主約C_紅利_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年",             "required": True},
            "4":  {"label": "合約起始月",             "required": True},
            "5":  {"label": "合約起始日",             "required": True},
            "6":  {"label": "合約起始時",             "required": False},
            "7":  {"label": "合約起始分",             "required": False},
            "8":  {"label": "合約結束年",             "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False},
            "12": {"label": "合約結束分",             "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",         "required": True},
            "17": {"label": "統一編號",       "required": True},
            "18": {"label": "地址",           "required": True},
            "19": {"label": "簽約年",         "required": True},
            "20": {"label": "簽約月",         "required": True},
            "21": {"label": "簽約日",         "required": True},
        },
    },
    "ibon_main_e": {
        "label": "ibon服務交易 主約E（好康）",
        "file":  "制式_ibon服務交易_主約E_好康_202601E.docx",
        "group": "ibon_main",
        "fields": {
            "1":  {"label": "合約編號(主約)",        "required": True},
            "2":  {"label": "甲方公司名稱",           "required": True},
            "3":  {"label": "合約起始年",             "required": True},
            "4":  {"label": "合約起始月",             "required": True},
            "5":  {"label": "合約起始日",             "required": True},
            "6":  {"label": "合約起始時",             "required": False},
            "7":  {"label": "合約起始分",             "required": False},
            "8":  {"label": "合約結束年",             "required": True},
            "9":  {"label": "合約結束月",             "required": True},
            "10": {"label": "合約結束日",             "required": True},
            "11": {"label": "合約結束時",             "required": False},
            "12": {"label": "合約結束分",             "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",         "required": True},
            "17": {"label": "統一編號",       "required": True},
            "18": {"label": "地址",           "required": True},
            "19": {"label": "簽約年",         "required": True},
            "20": {"label": "簽約月",         "required": True},
            "21": {"label": "簽約日",         "required": True},
        },
    },

    # ── ibon 服務交易 協議書 ──
    "ibon_agr_a1": {
        "label": "ibon服務交易 協議書a1（一般）",
        "file":  "制式_ibon服務交易_協議書a1_一般_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "45": {"label": "甲方公司名稱（協議書內）", "required": True},
            "46": {"label": "主約合約編號",         "required": True},
            "47": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "48": {"label": "代表人",              "required": True},
            "49": {"label": "統一編號",             "required": True},
            "50": {"label": "地址",                "required": True},
            "51": {"label": "簽約年(西元)",         "required": True},
            "52": {"label": "簽約月",               "required": True},
            "53": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_a2": {
        "label": "ibon服務交易 協議書a2（列印）",
        "file":  "制式_ibon服務交易_協議書a2_列印_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "20": {"label": "甲方公司名稱（協議書內）", "required": True},
            "21": {"label": "主約合約編號",         "required": True},
            "22": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "23": {"label": "代表人",              "required": True},
            "24": {"label": "統一編號",             "required": True},
            "25": {"label": "地址",                "required": True},
            "26": {"label": "簽約年(西元)",         "required": True},
        },
    },
    "ibon_agr_b1": {
        "label": "ibon服務交易 協議書b1（票券連線）",
        "file":  "制式_ibon服務交易_協議書b1_票劵(連線)_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "65": {"label": "甲方公司名稱（協議書內）", "required": True},
            "66": {"label": "主約合約編號",         "required": True},
            "67": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "68": {"label": "代表人",              "required": True},
            "69": {"label": "統一編號",             "required": True},
            "70": {"label": "地址",                "required": True},
            "71": {"label": "簽約年(西元)",         "required": True},
            "72": {"label": "簽約月",               "required": True},
            "73": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_b2": {
        "label": "ibon服務交易 協議書b2（電影票）",
        "file":  "制式_ibon服務交易_協議書b2_票劵_電影票_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "150": {"label": "甲方公司名稱（協議書內）", "required": True},
            "151": {"label": "主約合約編號",         "required": True},
            "152": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "153": {"label": "代表人",              "required": True},
            "154": {"label": "統一編號",             "required": True},
            "155": {"label": "地址",                "required": True},
            "156": {"label": "簽約年(西元)",         "required": True},
            "157": {"label": "簽約月",               "required": True},
            "158": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_b3": {
        "label": "ibon服務交易 協議書b3（演唱會保證）",
        "file":  "制式_ibon服務交易_協議書b3_票劵_演唱會_保證_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "65": {"label": "甲方公司名稱（協議書內）", "required": True},
            "66": {"label": "主約合約編號",         "required": True},
            "67": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "68": {"label": "代表人",              "required": True},
            "69": {"label": "統一編號",             "required": True},
            "70": {"label": "地址",                "required": True},
            "71": {"label": "簽約年(西元)",         "required": True},
            "72": {"label": "簽約月",               "required": True},
            "73": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_c": {
        "label": "ibon服務交易 協議書c（紅利）",
        "file":  "制式_ibon服務交易_協議書c_紅利_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "120": {"label": "甲方公司名稱（協議書內）", "required": True},
            "121": {"label": "主約合約編號",         "required": True},
            "122": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "123": {"label": "代表人",              "required": True},
            "124": {"label": "統一編號",             "required": True},
            "125": {"label": "地址",                "required": True},
            "126": {"label": "簽約年(西元)",         "required": True},
            "127": {"label": "簽約月",               "required": True},
            "128": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_e": {
        "label": "ibon服務交易 協議書e（好康）",
        "file":  "制式_ibon服務交易_協議書e_好康_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "88": {"label": "甲方公司名稱（協議書內）", "required": True},
            "89": {"label": "主約合約編號",         "required": True},
            "90": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "91": {"label": "代表人",              "required": True},
            "92": {"label": "統一編號",             "required": True},
            "93": {"label": "地址",                "required": True},
            "94": {"label": "簽約年(西元)",         "required": True},
            "95": {"label": "簽約月",               "required": True},
            "96": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_agr_e_igift": {
        "label": "ibon服務交易 協議書e（好康 i禮贈）",
        "file":  "制式_ibon服務交易_協議書e_好康_i禮贈_202601E.docx",
        "group": "ibon_agr",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "38": {"label": "甲方公司名稱（協議書內）", "required": True},
            "39": {"label": "主約合約編號",         "required": True},
            "40": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "41": {"label": "代表人",              "required": True},
            "42": {"label": "統一編號",             "required": True},
            "43": {"label": "地址",                "required": True},
            "44": {"label": "簽約年(西元)",         "required": True},
            "45": {"label": "簽約月",               "required": True},
            "46": {"label": "簽約日",               "required": True},
        },
    },

    # ── ibon 售票平台 ──
    "ibon_ticket_main": {
        "label": "ibon售票平台 主約（E票券）",
        "file":  "制式_ibon售票平台_主約_E票券_202601E.docx",
        "group": "ibon_ticket",
        "fields": {
            "1":  {"label": "合約編號(主約)",       "required": True},
            "5":  {"label": "紙票每張費用（元）",    "required": True},
            "6":  {"label": "電子票每張費用（元）",  "required": True},
            "10": {"label": "合約起始年",           "required": True},
            "11": {"label": "合約起始月",           "required": True},
            "12": {"label": "合約起始日",           "required": True},
            "13": {"label": "合約起始時",           "required": False},
            "15": {"label": "合約結束年",           "required": True},
            "16": {"label": "合約結束月",           "required": True},
            "17": {"label": "合約結束日",           "required": True},
            "18": {"label": "合約結束時",           "required": False},
            "23": {"label": "主辦單位聯絡人",        "required": True},
            "24": {"label": "主辦單位名稱",          "required": True},
            "25": {"label": "代表人",               "required": True},
            "26": {"label": "統一編號",             "required": True},
            "27": {"label": "地址",                "required": True},
            "28": {"label": "簽約年(西元)",         "required": True},
            "29": {"label": "簽約月",               "required": True},
            "30": {"label": "簽約日",               "required": True},
        },
    },
    "ibon_ticket_guarantee": {
        "label": "ibon售票平台 主約（E票券保證）",
        "file":  "制式_ibon售票平台_主約_E票券_保證_202601E.docx",
        "group": "ibon_ticket",
        "fields": {
            "1":  {"label": "合約編號(主約)",       "required": True},
            "5":  {"label": "紙票每張費用（元）",    "required": True},
            "6":  {"label": "電子票每張費用（元）",  "required": True},
            "10": {"label": "合約起始年",           "required": True},
            "11": {"label": "合約起始月",           "required": True},
            "12": {"label": "合約起始日",           "required": True},
            "13": {"label": "合約起始時",           "required": False},
            "15": {"label": "合約結束年",           "required": True},
            "16": {"label": "合約結束月",           "required": True},
            "17": {"label": "合約結束日",           "required": True},
            "18": {"label": "合約結束時",           "required": False},
            "23": {"label": "主辦單位聯絡人",        "required": True},
            "24": {"label": "主辦單位名稱",          "required": True},
            "25": {"label": "代表人",               "required": True},
            "26": {"label": "統一編號",             "required": True},
            "27": {"label": "地址",                "required": True},
            "28": {"label": "簽約年(西元)",         "required": True},
            "29": {"label": "簽約月",               "required": True},
            "30": {"label": "簽約日",               "required": True},
        },
    },

    # ── i禮讚平台 ──
    "ibon_izan_main": {
        "label": "i禮讚平台 主約",
        "file":  "制式_i禮讚平台_主約_202601E.docx",
        "group": "ibon_other",
        "fields": {
            "1":  {"label": "合約編號(主約)",  "required": True},
            "2":  {"label": "甲方公司名稱",    "required": True},
            "3":  {"label": "聯絡人",          "required": False},
            "4":  {"label": "甲方公司名稱（簽名頁）", "required": True},
            "5":  {"label": "代表人",          "required": True},
            "6":  {"label": "統一編號",        "required": True},
            "7":  {"label": "地址",            "required": True},
            "8":  {"label": "簽約年(西元)",    "required": True},
            "9":  {"label": "簽約月",          "required": True},
            "10": {"label": "簽約日",          "required": True},
        },
    },

    # ── 社群合作備忘錄 ──
    "ibon_social_memo": {
        "label": "社群合作備忘錄",
        "file":  "制式_社群合作備忘錄_202601E.docx",
        "group": "ibon_other",
        "fields": {},  # 無 FORMTEXT 欄位，需手動填寫
        "note":  "此範本無表單欄位，請下載後在 Word 中手動填寫空白處",
    },

    # ── 繳費通服務交易 ──
    "ibon_payment_main": {
        "label": "繳費通服務交易 主約（一般）",
        "file":  "制式_繳費通服務交易_主約_一般_202601E.docx",
        "group": "ibon_payment",
        "fields": {
            "1":  {"label": "合約編號(主約)",       "required": True},
            "2":  {"label": "甲方公司名稱",          "required": True},
            "3":  {"label": "合約起始年",            "required": True},
            "4":  {"label": "合約起始月",            "required": True},
            "5":  {"label": "合約起始日",            "required": True},
            "6":  {"label": "合約起始時",            "required": False},
            "7":  {"label": "合約起始分",            "required": False},
            "8":  {"label": "合約結束年",            "required": True},
            "9":  {"label": "合約結束月",            "required": True},
            "10": {"label": "合約結束日",            "required": True},
            "11": {"label": "合約結束時",            "required": False},
            "12": {"label": "合約結束分",            "required": False},
            "13": {"label": "甲方公司名稱（聯絡資訊）","required": False},
            "14": {"label": "甲方聯絡人及電話",       "required": False},
            "15": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "16": {"label": "代表人",               "required": True},
            "17": {"label": "統一編號",             "required": True},
            "18": {"label": "地址",                "required": True},
            "19": {"label": "簽約年",              "required": True},
            "20": {"label": "簽約月",              "required": True},
            "21": {"label": "簽約日",              "required": True},
        },
    },
    "ibon_payment_agr": {
        "label": "繳費通服務交易 協議書（一般）",
        "file":  "制式_繳費通服務交易_協議書_一般_202601E.docx",
        "group": "ibon_payment",
        "fields": {
            "1":  {"label": "合約編號",            "required": True},
            "22": {"label": "甲方公司名稱（協議書內）", "required": True},
            "23": {"label": "主約合約編號",         "required": True},
            "24": {"label": "甲方公司名稱（簽名頁）", "required": True},
            "25": {"label": "代表人",              "required": True},
            "26": {"label": "統一編號",             "required": True},
            "27": {"label": "地址",                "required": True},
            "28": {"label": "簽約年(西元)",         "required": True},
        },
    },
}


def get_template_list() -> list[dict]:
    """取得所有可用範本清單（供前端下拉選單使用）"""
    return [
        {
            "id": k,
            "label": v["label"],
            "group": v["group"],
            "has_form_fields": len(v["fields"]) > 0,
            "note": v.get("note", ""),
        }
        for k, v in IBON_TEMPLATES.items()
    ]


def get_template_fields(template_id: str) -> dict:
    """取得指定範本的欄位定義（供前端動態產生表單）"""
    tmpl = IBON_TEMPLATES.get(template_id)
    if not tmpl:
        raise ValueError(f"找不到範本：{template_id}")
    return {
        "id": template_id,
        "label": tmpl["label"],
        "fields": tmpl["fields"],
        "note": tmpl.get("note", ""),
    }


def generate_contract(
    template_id: str,
    field_values: dict,
    output_dir: str,
    filename: Optional[str] = None,
) -> str:
    """
    產生填寫後的合約 .docx 檔案。

    Args:
        template_id:  範本 ID（IBON_TEMPLATES 的 key）
        field_values: 欄位值 {"1": "AGR-001", "2": "台灣公司", ...}
        output_dir:   輸出目錄
        filename:     自訂檔名（不含副檔名）；預設自動產生

    Returns:
        輸出檔案的完整路徑
    """
    tmpl = IBON_TEMPLATES.get(template_id)
    if not tmpl:
        raise ValueError(f"找不到範本：{template_id}")

    template_path = os.path.join(TEMPLATE_DIR, tmpl["file"])
    if not os.path.exists(template_path):
        raise FileNotFoundError(f"範本檔案不存在：{template_path}")

    os.makedirs(output_dir, exist_ok=True)

    if not filename:
        today = date.today().strftime("%Y%m%d")
        uid = uuid.uuid4().hex[:6].upper()
        filename = f"{tmpl['label'].replace(' ', '_')}_{today}_{uid}"

    output_path = os.path.join(output_dir, f"{filename}.docx")

    # 社群合作備忘錄無 FORMTEXT 欄位，直接複製範本
    if not tmpl["fields"]:
        import shutil
        shutil.copy2(template_path, output_path)
        os.chmod(output_path, 0o644)
    else:
        fill_formtext_fields(template_path, output_path, field_values)

    return output_path


def auto_fill_from_contract(contract, template_id: str) -> dict:
    """
    從合約資料自動填充常用欄位值。

    Args:
        contract:    Contract ORM 物件
        template_id: 範本 ID

    Returns:
        預填的 field_values 字典
    """
    today = date.today()
    values = {}

    tmpl = IBON_TEMPLATES.get(template_id, {})
    fields = tmpl.get("fields", {})

    # 公司名稱（從 vendor）
    vendor_name = contract.vendor.name if contract.vendor else ""

    for fid, fdef in fields.items():
        label = fdef["label"]
        if "合約編號" in label and "主約" not in label:
            values[fid] = contract.contract_no or ""
        elif "合約編號(主約)" in label:
            values[fid] = contract.contract_no or ""
        elif "甲方公司名稱" in label or "主辦單位名稱" in label:
            values[fid] = vendor_name
        elif "甲方聯絡人及電話" in label:
            contact = contract.vendor.contact_name if contract.vendor and contract.vendor.contact_name else ""
            phone   = contract.vendor.contact_phone if contract.vendor and contract.vendor.contact_phone else ""
            values[fid] = f"{contact}　{phone}".strip("　") if (contact or phone) else ""
        elif "統一編號" in label:
            values[fid] = contract.vendor.tax_id if contract.vendor and hasattr(contract.vendor, "tax_id") else ""
        elif "地址" in label:
            values[fid] = contract.vendor.address if contract.vendor and hasattr(contract.vendor, "address") else ""
        elif "代表人" in label:
            values[fid] = contract.vendor.contact_name if contract.vendor and hasattr(contract.vendor, "contact_name") else ""
        elif "合約起始年" in label and contract.start_date:
            values[fid] = str(contract.start_date.year)
        elif "合約起始月" in label and contract.start_date:
            values[fid] = f"{contract.start_date.month:02d}"
        elif "合約起始日" in label and contract.start_date:
            values[fid] = f"{contract.start_date.day:02d}"
        elif "合約結束年" in label and contract.end_date:
            values[fid] = str(contract.end_date.year)
        elif "合約結束月" in label and contract.end_date:
            values[fid] = f"{contract.end_date.month:02d}"
        elif "合約結束日" in label and contract.end_date:
            values[fid] = f"{contract.end_date.day:02d}"
        elif "簽約年" in label:
            values[fid] = str(today.year)
        elif "簽約月" in label:
            values[fid] = f"{today.month:02d}"
        elif "簽約日" in label:
            values[fid] = f"{today.day:02d}"

    return values
