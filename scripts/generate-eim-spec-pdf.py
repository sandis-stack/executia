#!/usr/bin/env python3
"""Generate EXECUTIA EIM-1.0 Reference Specification PDF (institutional document)."""

from __future__ import annotations

from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "docs" / "EXECUTIA-EIM-1.0-Reference-Specification.pdf"

INK = HexColor("#0F172A")
MUTED = HexColor("#475569")
LINE = HexColor("#CBD5E1")
SOFT = HexColor("#F8FAFC")
ACCENT = HexColor("#0A2E3F")


def build_styles():
    base = getSampleStyleSheet()
    return {
        "cover_brand": ParagraphStyle(
            "cover_brand",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=ACCENT,
            alignment=TA_CENTER,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=28,
            textColor=INK,
            alignment=TA_CENTER,
            spaceBefore=18,
            spaceAfter=10,
        ),
        "cover_sub": ParagraphStyle(
            "cover_sub",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "cover_meta": ParagraphStyle(
            "cover_meta",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=14,
            textColor=MUTED,
            alignment=TA_CENTER,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=18,
            textColor=ACCENT,
            spaceBefore=0,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=15,
            textColor=INK,
            spaceBefore=12,
            spaceAfter=6,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=8,
        ),
        "body_left": ParagraphStyle(
            "body_left",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=15,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=8,
        ),
        "lead": ParagraphStyle(
            "lead",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=11,
            leading=16,
            textColor=INK,
            alignment=TA_JUSTIFY,
            spaceAfter=10,
        ),
        "mono": ParagraphStyle(
            "mono",
            parent=base["Normal"],
            fontName="Courier",
            fontSize=8.5,
            leading=12,
            textColor=INK,
            alignment=TA_LEFT,
            spaceBefore=4,
            spaceAfter=8,
        ),
        "caption": ParagraphStyle(
            "caption",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceAfter=6,
        ),
        "bullet": ParagraphStyle(
            "bullet",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=INK,
        ),
    }


def draw_header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    margin = 18 * mm

    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.6)
    canvas.line(margin, h - 14 * mm, w - margin, h - 14 * mm)

    canvas.setFillColor(ACCENT)
    canvas.setFont("Helvetica-Bold", 8)
    canvas.drawString(margin, h - 11.5 * mm, "EXECUTIA™")

    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawRightString(
        w - margin,
        h - 11.5 * mm,
        "Document ID: EIM-1.0  ·  Version 1.0  ·  Public Release",
    )

    canvas.setStrokeColor(LINE)
    canvas.line(margin, 14 * mm, w - margin, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawString(
        margin,
        9.5 * mm,
        "EXECUTIA™  ·  Execution Integrity Model  ·  Reference Specification",
    )
    canvas.drawRightString(w - margin, 9.5 * mm, f"Page {doc.page}")
    canvas.restoreState()


def draw_cover_page(canvas, doc):
    draw_header_footer(canvas, doc)
    w, h = A4
    canvas.saveState()
    canvas.setFillColor(ACCENT)
    canvas.rect(0, h - 42 * mm, w, 8 * mm, stroke=0, fill=1)
    canvas.restoreState()


def bullets(styles, items):
    return ListFlowable(
        [
            ListItem(Paragraph(i, styles["bullet"]), leftIndent=12, bulletColor=ACCENT)
            for i in items
        ],
        bulletType="bullet",
        start="•",
        leftIndent=10,
        spaceBefore=2,
        spaceAfter=8,
    )


def flow_table(styles):
    data = [
        [
            Paragraph("<b>Stage</b>", styles["caption"]),
            Paragraph("<b>Definition</b>", styles["caption"]),
        ],
        [
            Paragraph("Business Intent", styles["body_left"]),
            Paragraph(
                "The organizational purpose or objective that initiates action.",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Requested Action", styles["body_left"]),
            Paragraph(
                "The concrete action proposed to advance intent.",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Governed Decision", styles["body_left"]),
            Paragraph(
                "Authorization or containment determined by EXECUTIA before execution.",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Verified Execution", styles["body_left"]),
            Paragraph(
                "Authorized action carried out under recorded constraints.",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Business Outcome", styles["body_left"]),
            Paragraph(
                "Result produced after verified execution, bounded by governance.",
                styles["body_left"],
            ),
        ],
    ]
    t = Table(data, colWidths=[42 * mm, 118 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def arch_table(styles):
    data = [
        [
            Paragraph("<b>Layer</b>", styles["caption"]),
            Paragraph("<b>Purpose</b>", styles["caption"]),
            Paragraph("<b>Responsibility</b>", styles["caption"]),
        ],
        [
            Paragraph("Business Layer", styles["body_left"]),
            Paragraph("Defines intended actions.", styles["body_left"]),
            Paragraph(
                "Business Intent → Decision → Requested Action",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Execution Integrity Layer", styles["body_left"]),
            Paragraph("Determines whether it may happen.", styles["body_left"]),
            Paragraph(
                "Validate → Authorize → Approved / Blocked + Evidence",
                styles["body_left"],
            ),
        ],
        [
            Paragraph("Execution Layer", styles["body_left"]),
            Paragraph("Carries out authorized execution.", styles["body_left"]),
            Paragraph(
                "Verified Execution → Business Outcome",
                styles["body_left"],
            ),
        ],
    ]
    t = Table(data, colWidths=[42 * mm, 48 * mm, 70 * mm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("BACKGROUND", (0, 2), (-1, 2), HexColor("#EEF6F8")),
                ("GRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return t


def main():
    styles = build_styles()
    OUT.parent.mkdir(parents=True, exist_ok=True)

    frame = Frame(18 * mm, 20 * mm, A4[0] - 36 * mm, A4[1] - 40 * mm, id="normal")
    doc = BaseDocTemplate(
        str(OUT),
        pagesize=A4,
        title="EXECUTIA EIM-1.0 Reference Specification",
        author="EXECUTIA",
        subject="Execution Integrity Model — Reference Specification",
        creator="EXECUTIA",
    )
    doc.addPageTemplates(
        [
            PageTemplate(id="cover", frames=[frame], onPage=draw_cover_page),
            PageTemplate(id="body", frames=[frame], onPage=draw_header_footer),
        ]
    )

    story = []

    # 1. Cover
    story.append(NextPageTemplate("cover"))
    story.append(Spacer(1, 28 * mm))
    story.append(Paragraph("EXECUTIA™", styles["cover_brand"]))
    story.append(Paragraph("Execution Integrity Model", styles["cover_title"]))
    story.append(Paragraph("Reference Specification", styles["cover_sub"]))
    story.append(Spacer(1, 8 * mm))
    story.append(
        HRFlowable(
            width="40%",
            thickness=0.8,
            color=ACCENT,
            spaceBefore=4,
            spaceAfter=12,
            hAlign="CENTER",
        )
    )
    story.append(Paragraph("Document ID: <b>EIM-1.0</b>", styles["cover_meta"]))
    story.append(
        Paragraph(
            "Version 1.0  ·  Public Release  ·  Status: Approved",
            styles["cover_meta"],
        )
    )
    story.append(Paragraph("Classification: Public", styles["cover_meta"]))
    story.append(Spacer(1, 14 * mm))
    story.append(
        Paragraph(
            "Canonical flow:<br/><b>Business Intent → Requested Action → Governed Decision → Verified Execution → Business Outcome</b>",
            styles["cover_meta"],
        )
    )
    story.append(Spacer(1, 22 * mm))
    story.append(
        Paragraph(
            "This document defines the institutional reference model for governing execution<br/>before actions become irreversible.",
            styles["cover_sub"],
        )
    )
    story.append(NextPageTemplate("body"))
    story.append(PageBreak())

    def add_section(num, title, blocks, last=False):
        story.append(Paragraph(f"{num}.  {title}", styles["h1"]))
        story.extend(blocks)
        if not last:
            story.append(PageBreak())

    # 2. Executive Summary
    add_section(
        "2",
        "Executive Summary",
        [
            Paragraph(
                "EXECUTIA™ establishes a New Standard for Organizational Execution. The Execution Integrity Model (EIM-1.0) "
                "defines the governance layer between business decisions and verified execution.",
                styles["lead"],
            ),
            Paragraph(
                "Most organizational loss does not originate in strategy formation. It originates where intent is translated "
                "into irreversible action without consistent validation, authorization, and evidence. EIM-1.0 places a "
                "deterministic integrity layer at that boundary.",
                styles["body"],
            ),
            Paragraph(
                "This specification describes the canonical architecture, execution flow, governance boundary, evidence model, "
                "and application domains for institutional adoption. It is the authoritative public reference for EIM-1.0.",
                styles["body"],
            ),
            Paragraph("<b>Document control</b>", styles["h2"]),
            Paragraph(
                "Document ID: EIM-1.0<br/>Version: 1.0<br/>Status: Approved<br/>Release class: Public<br/>"
                "Specification family: Execution Integrity Model",
                styles["body_left"],
            ),
        ],
    )

    # 3. Problem
    add_section(
        "3",
        "Problem",
        [
            Paragraph(
                "Every organization loses value through poor execution. Decisions are made continuously; failures often appear later — "
                "as error, delay, fraud, or waste — after irreversible commitments have already been made.",
                styles["lead"],
            ),
            Paragraph(
                "Contemporary systems frequently detect problems after they occur. Monitoring, reporting, and retrospective audit "
                "are necessary but insufficient. They observe outcomes; they do not govern the moment of execution.",
                styles["body"],
            ),
            Paragraph("<b>Failure modes during execution</b>", styles["h2"]),
            bullets(
                styles,
                [
                    "<b>Error</b> — incorrect or unauthorized action proceeds without pre-execution validation.",
                    "<b>Delay</b> — unclear authority and missing evidence stall critical paths.",
                    "<b>Fraud</b> — actions advance without accountable authorization records.",
                    "<b>Waste</b> — value leaks through unmanaged handoffs between intent and outcome.",
                ],
            ),
            Paragraph(
                "The institutional requirement is therefore not additional dashboards alone, but a governed execution boundary "
                "that can approve or contain action before it happens.",
                styles["body"],
            ),
        ],
    )

    # 4. Principles
    add_section(
        "4",
        "Principles",
        [
            Paragraph(
                "EIM-1.0 is guided by the following institutional principles.",
                styles["lead"],
            ),
            bullets(
                styles,
                [
                    "<b>Govern before irreversible action.</b> Validation and authorization precede execution.",
                    "<b>Evidence-first.</b> Decisions require defined evidence; proof is generated as a byproduct of governance.",
                    "<b>Deterministic control.</b> Authorize or contain — binary gates replace ambiguous escalation theatre.",
                    "<b>Explainable decisions.</b> Every approval, block, or review records its basis.",
                    "<b>Data ownership remains with the customer.</b> EXECUTIA governs execution; it does not replace systems of record.",
                    "<b>Audit-ready by design.</b> Execution events form a traceable record, not a reconstructed report.",
                    "<b>One canonical flow.</b> Intent → Action → Decision → Execution → Outcome remains continuous and unambiguous.",
                ],
            ),
        ],
    )

    # 5. Reference Architecture
    add_section(
        "5",
        "Reference Architecture",
        [
            Paragraph(
                "The Execution Integrity Model is expressed as three layers with a single vertical execution axis.",
                styles["lead"],
            ),
            arch_table(styles),
            Spacer(1, 4 * mm),
            Paragraph(
                "The Execution Integrity Layer is the institutional core. It sits between business intent and operational execution, "
                "forming the EXECUTIA Governance Boundary. Actions may not cross that boundary without evaluation.",
                styles["body"],
            ),
            Paragraph(
                "Within the integrity layer, evaluation proceeds as Validate → Authorize, with Automatically Generated Evidence "
                "produced at authorization, and a binary gate of Approved or Blocked (action contained; risk prevented).",
                styles["body"],
            ),
        ],
    )

    # 6. Execution Flow
    add_section(
        "6",
        "Execution Flow",
        [
            Paragraph("Canonical flow for EIM-1.0:", styles["lead"]),
            Paragraph(
                "Business Intent → Requested Action → Governed Decision → Verified Execution → Business Outcome",
                styles["mono"],
            ),
            flow_table(styles),
            Spacer(1, 4 * mm),
            Paragraph(
                "Flow is continuous and directional. Business Outcome remains bounded by the EXECUTIA Governance Boundary: "
                "outcomes are produced only after verified execution of authorized action.",
                styles["body"],
            ),
        ],
    )

    # 7. Governance Boundary
    add_section(
        "7",
        "Governance Boundary",
        [
            Paragraph(
                "The EXECUTIA Governance Boundary is the institutional control surface between deciding and doing.",
                styles["lead"],
            ),
            Paragraph(
                "Upper boundary: separates Business Layer activity (intent, decision, requested action) from integrity evaluation.",
                styles["body"],
            ),
            Paragraph(
                "Lower boundary: separates authorized integrity outcomes from Execution Layer activity (verified execution and business outcome).",
                styles["body"],
            ),
            Paragraph("<b>Boundary rules</b>", styles["h2"]),
            bullets(
                styles,
                [
                    "No requested action crosses into execution without Validate → Authorize.",
                    "Authorization produces evidence as an automatic byproduct.",
                    "Blocked actions are contained; risk is prevented before irreversible commitment.",
                    "Approved actions proceed only as Verified Execution under recorded constraints.",
                ],
            ),
            Paragraph(
                "The boundary is not a reporting overlay. It is the operating condition for execution integrity.",
                styles["body"],
            ),
        ],
    )

    # 8. Evidence Model
    add_section(
        "8",
        "Evidence Model",
        [
            Paragraph(
                "Evidence in EIM-1.0 is generated during governance — not assembled afterward for appearance of control.",
                styles["lead"],
            ),
            Paragraph("<b>Evidence properties</b>", styles["h2"]),
            bullets(
                styles,
                [
                    "<b>Automatic</b> — produced at authorization as a structural byproduct of the integrity layer.",
                    "<b>Decision-linked</b> — each record is bound to the Validate → Authorize path and gate outcome.",
                    "<b>Explainable</b> — records preserve the basis for approval, block, or review.",
                    "<b>Audit-ready</b> — the event stream is the audit artifact; reconstruction is not required.",
                    "<b>Customer-controlled data</b> — operational data remains under customer ownership.",
                ],
            ),
            Paragraph(
                "Evidence enables institutional trust: regulated environments, infrastructure programs, and enterprise control "
                "functions can inspect governed execution without depending on informal narrative.",
                styles["body"],
            ),
        ],
    )

    # 9. Applications
    add_section(
        "9",
        "Applications",
        [
            Paragraph(
                "EIM-1.0 applies wherever irreversible action must be governed across organizational and system boundaries.",
                styles["lead"],
            ),
            Paragraph("<b>Institutional domains</b>", styles["h2"]),
            bullets(
                styles,
                [
                    "<b>Government</b> — validate authority and evidence before commitments proceed across agencies.",
                    "<b>Infrastructure</b> — surface ownership and proof gaps before operational failure.",
                    "<b>Energy</b> — enforce evidence and accountability at execution time for regulated change.",
                    "<b>Finance</b> — apply deterministic rules before funds or commitments move.",
                    "<b>Enterprise</b> — connect mission, decision, and execution across functions and systems.",
                ],
            ),
            Paragraph("<b>Platform expression</b>", styles["h2"]),
            Paragraph(
                "The EXECUTIA Platform implements governance, evidence, and verification capabilities consistent with this model. "
                "First implementation — LIFE (Personal Execution Intelligence) — demonstrates governed execution at human scale. "
                "Organizational scale continues through EXECUTIA ONE and related institutional pathways.",
                styles["body"],
            ),
        ],
    )

    # 10. Future
    add_section(
        "10",
        "Future",
        [
            Paragraph("Better execution creates better outcomes.", styles["lead"]),
            Paragraph(
                "EIM-1.0 freezes the canonical reference architecture for public institutional use. Subsequent specification "
                "family releases may extend profiles, sector annexes, and conformance criteria without altering the canonical flow:",
                styles["body"],
            ),
            Paragraph(
                "Business Intent → Requested Action → Governed Decision → Verified Execution → Business Outcome",
                styles["mono"],
            ),
            Paragraph(
                "Certification and formal assurance claims are published only when independently achieved. This document makes "
                "no premature certification claim; it defines the model against which future conformance may be assessed.",
                styles["body"],
            ),
            Spacer(1, 8 * mm),
            HRFlowable(width="100%", thickness=0.5, color=LINE, spaceBefore=4, spaceAfter=10),
            Paragraph("EXECUTIA™", styles["h2"]),
            Paragraph("Execution Integrity Standard", styles["body_left"]),
            Paragraph(
                "Document ID: EIM-1.0  ·  Version 1.0  ·  Public Release",
                styles["caption"],
            ),
        ],
        last=True,
    )

    doc.build(story)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
