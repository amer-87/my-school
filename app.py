import tkinter as tk
from tkinter import ttk

from data.db import init_db


class SchoolDesktopApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("نظام إدارة المدارس")
        self.geometry("1280x800")
        self.minsize(1000, 700)
        self.configure(bg="#f4f7fb")

        self._build_ui()

    def _build_ui(self):
        self.style = ttk.Style(self)
        self.style.theme_use("clam")
        self.style.configure("Sidebar.TFrame", background="#0f172a")
        self.style.configure("Content.TFrame", background="#f8fafc")
        self.style.configure("Card.TFrame", background="#ffffff")
        self.style.configure("Title.TLabel", font=("Segoe UI", 22, "bold"), background="#f8fafc")
        self.style.configure("Subtitle.TLabel", font=("Segoe UI", 11), background="#f8fafc")
        self.style.configure("Nav.TButton", font=("Segoe UI", 11), padding=10)

        self.rowconfigure(0, weight=1)
        self.columnconfigure(1, weight=1)

        sidebar = ttk.Frame(self, style="Sidebar.TFrame")
        sidebar.grid(row=0, column=0, sticky="nsew")
        sidebar.rowconfigure(0, weight=1)
        sidebar.columnconfigure(0, weight=1)

        title = ttk.Label(sidebar, text="إدارة المدارس", foreground="#ffffff", background="#0f172a", font=("Segoe UI", 18, "bold"))
        title.grid(row=0, column=0, padx=18, pady=(24, 16), sticky="w")

        modules = [
            ("students", "إدارة الطلاب"),
            ("teachers", "إدارة المعلمين"),
            ("classes", "الصفوف والشعب"),
            ("attendance", "الحضور والغياب"),
            ("exams", "الامتحانات والدرجات"),
            ("fees", "الإدارة المالية"),
            ("documents", "الهويات والشهادات"),
            ("reports", "التقارير والإحصائيات"),
        ]

        self.nav_buttons = []
        for index, (key, label) in enumerate(modules, start=1):
            button = ttk.Button(
                sidebar,
                text=label,
                style="Nav.TButton",
                command=lambda k=key: self.show_module(k),
            )
            button.grid(row=index, column=0, padx=12, pady=4, sticky="ew")
            self.nav_buttons.append(button)

        self.content_frame = ttk.Frame(self, style="Content.TFrame")
        self.content_frame.grid(row=0, column=1, sticky="nsew", padx=(12, 12), pady=(12, 12))
        self.content_frame.rowconfigure(0, weight=1)
        self.content_frame.columnconfigure(0, weight=1)

        self.show_module("students")

    def show_module(self, module_name):
        for widget in self.content_frame.winfo_children():
            widget.destroy()

        panel = ttk.Frame(self.content_frame, style="Card.TFrame")
        panel.grid(row=0, column=0, sticky="nsew")
        panel.rowconfigure(1, weight=1)
        panel.columnconfigure(0, weight=1)

        title_text = {
            "students": "إدارة الطلاب",
            "teachers": "إدارة المعلمين",
            "classes": "إدارة الصفوف والشعب",
            "attendance": "الحضور والغياب",
            "exams": "الامتحانات والدرجات",
            "fees": "الرسوم والاقساط",
            "documents": "طباعة الهويات والشهادات",
            "reports": "التقارير والإحصائيات",
        }[module_name]

        ttk.Label(panel, text=title_text, style="Title.TLabel").grid(row=0, column=0, padx=20, pady=(20, 6), sticky="w")
        ttk.Label(
            panel,
            text="هذا قالب أولي للنظام، وسيتم توسيعه لاحقًا بإضافة واجهات CRUD وعمليات متقدمة.",
            style="Subtitle.TLabel",
            wraplength=700,
        ).grid(row=1, column=0, padx=20, pady=(0, 16), sticky="w")

        cards = ttk.Frame(panel)
        cards.grid(row=2, column=0, padx=20, pady=(0, 20), sticky="nsew")
        cards.columnconfigure(0, weight=1)
        cards.columnconfigure(1, weight=1)

        features = {
            "students": ["إضافة وتعديل وحذف الطلاب", "تسجيل الصفوف والبرامج", "بحث متقدم وإحصاءات سريعة"],
            "teachers": ["إدارة المعلمين", "تعيين المواد والصفوف", "متابعة المهام الإدارية"],
            "classes": ["إدارة الصفوف", "إدارة الشعب", "توزيع الطلاب على الشعب"],
            "attendance": ["تسجيل الحضور والغياب", "تقارير يومية وشهرية", "تنبيهات الغياب"],
            "exams": ["إعداد الجداول", "إدخال الدرجات", "كشف الدرجات والرسوب"],
            "fees": ["إدارة الرسوم", "إدارة الاقساط", "تنبيهات الدفع"],
            "documents": ["طباعة الهويات", "إصدار الشهادات", "تصميم القوالب"],
            "reports": ["تقارير مفصلة", "رسوم بيانية", "إحصائيات الأداء"],
        }[module_name]

        for index, item in enumerate(features):
            card = ttk.Frame(cards, padding=14)
            card.grid(row=0, column=index % 2, sticky="nsew", padx=(0, 12), pady=(0, 12))
            ttk.Label(card, text=f"• {item}", font=("Segoe UI", 11), wraplength=280).pack(anchor="w")

        if module_name == "reports":
            chart = ttk.Label(panel, text="لوحة إحصائيات جاهزة لعرض المؤشرات القادمة", font=("Segoe UI", 12, "bold"))
            chart.grid(row=3, column=0, padx=20, pady=(0, 14), sticky="w")


if __name__ == "__main__":
    init_db()
    app = SchoolDesktopApp()
    app.mainloop()
