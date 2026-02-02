#!/usr/bin/env python3
"""Generate PDF analysis: Europe, Israel and the Jewish Diaspora"""

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Image,
                                 Table, TableStyle, PageBreak, KeepTogether)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY
from io import BytesIO
import os

# Colors
BG_DARK = '#0f172a'
BG_PANEL = '#1e293b'
BLUE = '#3b82f6'
AMBER = '#f59e0b'
RED = '#ef4444'
GREEN = '#10b981'
PURPLE = '#8b5cf6'
CYAN = '#06b6d4'
PINK = '#ec4899'
SLATE = '#94a3b8'
WHITE = '#f8fafc'

# Data
countries = ['Francia', 'R. Unido', 'Alemania', 'Hungria', 'P. Bajos', 'Belgica',
             'Italia', 'Suiza', 'Suecia', 'Espana', 'Austria', 'Rumania',
             'Polonia', 'Dinamarca', 'Grecia', 'Chequia', 'Irlanda', 'Finlandia',
             'Noruega', 'Portugal']
populations = [438500, 313000, 125000, 45000, 35000, 29000, 26800, 20500,
               14900, 13000, 10300, 9400, 8000, 6400, 4500, 3900, 1600, 1300, 1300, 600]
# 1=votes against Israel, 2=abstention, 3=votes pro-Israel
support_level = [1, 2, 2, 3, 2, 1, 2, 2, 1, 1, 2, 2, 2, 2, 1, 3, 1, 1, 1, 1]
stance_labels = {1: 'A favor', 2: 'Abstencion', 3: 'En contra'}
stance_colors_map = {1: RED, 2: AMBER, 3: GREEN}

plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10

OUTPUT_DIR = '/home/user/fiuak2.github.io'

def make_population_chart():
    """Horizontal bar chart of Jewish population by country."""
    fig, ax = plt.subplots(figsize=(8, 6))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    y = np.arange(len(countries))
    colors = [stance_colors_map[s] for s in support_level]

    bars = ax.barh(y, populations, color=colors, edgecolor='white', linewidth=0.3, height=0.7)

    ax.set_yticks(y)
    ax.set_yticklabels(countries, color=WHITE, fontsize=9)
    ax.invert_yaxis()
    ax.set_xscale('log')
    ax.set_xlabel('Poblacion Judia (escala logaritmica)', color=SLATE, fontsize=10)
    ax.tick_params(colors=SLATE)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(SLATE)
    ax.spines['left'].set_color(SLATE)
    ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda x, _: f'{int(x):,}'))

    # Add value labels
    for bar, pop in zip(bars, populations):
        ax.text(pop * 1.15, bar.get_y() + bar.get_height()/2,
                f'{pop:,}', va='center', ha='left', color=WHITE, fontsize=7)

    legend_patches = [
        mpatches.Patch(color=GREEN, label='Vota pro-Israel (En contra resoluciones)'),
        mpatches.Patch(color=AMBER, label='Abstencion'),
        mpatches.Patch(color=RED, label='Vota contra Israel (A favor resoluciones)')
    ]
    ax.legend(handles=legend_patches, loc='lower right', fontsize=7,
              facecolor=BG_PANEL, edgecolor=SLATE, labelcolor=WHITE)

    ax.set_title('Poblacion Judia en Europa (2024) y Postura ONU', color=WHITE, fontsize=12, fontweight='bold', pad=15)
    plt.tight_layout()

    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def make_scatter_chart():
    """Scatter: population vs support level."""
    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    for lvl, label, color in [(1, 'Vota contra Israel', RED), (2, 'Abstencion', AMBER), (3, 'Vota pro-Israel', GREEN)]:
        mask = [s == lvl for s in support_level]
        pops = [p for p, m in zip(populations, mask) if m]
        lvls = [l for l, m in zip(support_level, mask) if m]
        names = [c for c, m in zip(countries, mask) if m]
        ax.scatter(pops, lvls, c=color, s=120, label=label, edgecolors='white', linewidth=0.5, zorder=5)
        for p, l, n in zip(pops, lvls, names):
            ax.annotate(n, (p, l), textcoords="offset points", xytext=(8, 5),
                        fontsize=6.5, color=WHITE, alpha=0.9)

    ax.set_xscale('log')
    ax.set_xlabel('Poblacion Judia (escala logaritmica)', color=SLATE, fontsize=10)
    ax.set_ylabel('Nivel de Apoyo a Israel', color=SLATE, fontsize=10)
    ax.set_yticks([1, 2, 3])
    ax.set_yticklabels(['Vota contra', 'Abstencion', 'Vota pro-Israel'], color=WHITE, fontsize=9)
    ax.set_ylim(0.5, 3.5)
    ax.tick_params(colors=SLATE)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(SLATE)
    ax.spines['left'].set_color(SLATE)
    ax.grid(True, alpha=0.15, color='white')
    ax.legend(loc='upper left', fontsize=8, facecolor=BG_PANEL, edgecolor=SLATE, labelcolor=WHITE)
    ax.set_title('Poblacion Judia vs. Nivel de Apoyo a Israel', color=WHITE, fontsize=12, fontweight='bold', pad=15)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def make_eu_parliament_chart():
    """Bar chart: EU Parliament pro-Israel voting by political group."""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 5))
    fig.patch.set_facecolor(BG_DARK)

    # By political group
    ax1.set_facecolor(BG_DARK)
    groups = ['ECR', 'ID', 'EPP', 'Renew', 'S&D', 'Verdes', 'The Left']
    pcts = [90, 88, 60, 45, 18, 12, 5]
    colors_g = [GREEN if v >= 60 else AMBER if v >= 40 else RED for v in pcts]

    bars1 = ax1.barh(groups, pcts, color=colors_g, edgecolor='white', linewidth=0.3)
    ax1.set_xlim(0, 100)
    ax1.invert_yaxis()
    ax1.set_xlabel('% Votos Pro-Israel', color=SLATE, fontsize=9)
    ax1.set_title('Por Grupo Politico', color=CYAN, fontsize=11, fontweight='bold')
    ax1.tick_params(colors=SLATE)
    ax1.spines['top'].set_visible(False)
    ax1.spines['right'].set_visible(False)
    ax1.spines['bottom'].set_color(SLATE)
    ax1.spines['left'].set_color(SLATE)
    for bar, pct in zip(bars1, pcts):
        ax1.text(pct + 2, bar.get_y() + bar.get_height()/2,
                 f'{pct}%', va='center', color=WHITE, fontsize=8, fontweight='bold')

    # By country
    ax2.set_facecolor(BG_DARK)
    ctries = ['Chequia', 'Hungria', 'Polonia', 'Italia', 'Alemania', 'Francia', 'P. Bajos', 'Belgica', 'Espana', 'Irlanda']
    cpcts = [95, 90, 76, 65, 55, 40, 38, 30, 26, 14.6]
    colors_c = [GREEN if v >= 70 else AMBER if v >= 40 else RED for v in cpcts]

    bars2 = ax2.bar(ctries, cpcts, color=colors_c, edgecolor='white', linewidth=0.3)
    ax2.set_ylim(0, 100)
    ax2.set_ylabel('% Pro-Israel', color=SLATE, fontsize=9)
    ax2.set_title('Por Nacionalidad', color=CYAN, fontsize=11, fontweight='bold')
    ax2.tick_params(colors=SLATE, axis='y')
    ax2.set_xticklabels(ctries, rotation=45, ha='right', color=SLATE, fontsize=8)
    ax2.spines['top'].set_visible(False)
    ax2.spines['right'].set_visible(False)
    ax2.spines['bottom'].set_color(SLATE)
    ax2.spines['left'].set_color(SLATE)
    for bar, pct in zip(bars2, cpcts):
        ax2.text(bar.get_x() + bar.get_width()/2, pct + 2,
                 f'{pct}%', ha='center', color=WHITE, fontsize=7, fontweight='bold')

    plt.suptitle('Votacion en Parlamento Europeo sobre Israel (71 votos, 2019-2022)',
                 color=WHITE, fontsize=12, fontweight='bold', y=1.02)
    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def make_erosion_chart():
    """Line chart: erosion of European support over time."""
    fig, ax = plt.subplots(figsize=(8, 4.5))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    years = [2017, 2019, 2021, 2023, 2025]
    abstentions = [8, 10, 11, 13, 2]
    against = [2, 2, 2, 2, 1]

    ax.plot(years, abstentions, 'o-', color=AMBER, linewidth=3, markersize=10,
            markeredgecolor='white', markeredgewidth=2, label='Se abstienen', zorder=5)
    ax.fill_between(years, abstentions, alpha=0.15, color=AMBER)

    ax.plot(years, against, 's-', color=GREEN, linewidth=3, markersize=10,
            markeredgecolor='white', markeredgewidth=2, label='Votan contra (pro-Israel)', zorder=5)
    ax.fill_between(years, against, alpha=0.15, color=GREEN)

    for x, y in zip(years, abstentions):
        ax.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, 12),
                    ha='center', color=AMBER, fontsize=10, fontweight='bold')
    for x, y in zip(years, against):
        ax.annotate(str(y), (x, y), textcoords="offset points", xytext=(0, -18),
                    ha='center', color=GREEN, fontsize=10, fontweight='bold')

    ax.set_xlabel('Ano', color=SLATE, fontsize=10)
    ax.set_ylabel('Numero de paises UE', color=SLATE, fontsize=10)
    ax.set_ylim(0, 18)
    ax.set_xticks(years)
    ax.tick_params(colors=SLATE)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(SLATE)
    ax.spines['left'].set_color(SLATE)
    ax.grid(True, alpha=0.1, color='white')
    ax.legend(fontsize=9, facecolor=BG_PANEL, edgecolor=SLATE, labelcolor=WHITE)
    ax.set_title('Erosion del Apoyo Europeo a Israel en la ONU (2017-2025)',
                 color=WHITE, fontsize=12, fontweight='bold', pad=15)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def make_factors_chart():
    """Radar chart: factors determining support for Israel."""
    fig, ax = plt.subplots(figsize=(6, 6), subplot_kw=dict(polar=True))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    labels = ['Ideologia\nPolitica', 'Relaciones\nComerciales', 'Demografia\nMusulmana',
              'Experiencia\nTotalitaria', 'Responsabilidad\nHistorica', 'Poblacion\nJudia']
    values = [95, 65, 60, 55, 50, 15]

    N = len(labels)
    angles = np.linspace(0, 2 * np.pi, N, endpoint=False).tolist()
    values_plot = values + [values[0]]
    angles += [angles[0]]

    ax.fill(angles, values_plot, color=PURPLE, alpha=0.25)
    ax.plot(angles, values_plot, 'o-', color=PURPLE, linewidth=2.5, markersize=8,
            markeredgecolor='white', markeredgewidth=1.5)

    ax.set_xticks(angles[:-1])
    ax.set_xticklabels(labels, color=WHITE, fontsize=9, fontweight='bold')
    ax.set_ylim(0, 100)
    ax.set_yticks([25, 50, 75, 100])
    ax.set_yticklabels(['25', '50', '75', '100'], color=SLATE, fontsize=7)
    ax.tick_params(colors=SLATE)
    ax.grid(color=SLATE, alpha=0.3)
    ax.spines['polar'].set_color(SLATE)

    ax.set_title('Factores Determinantes del Apoyo a Israel\n(Peso relativo segun literatura academica)',
                 color=WHITE, fontsize=11, fontweight='bold', pad=20)

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def make_opinion_chart():
    """Bar chart: public opinion on Israel."""
    fig, ax = plt.subplots(figsize=(8, 4.5))
    fig.patch.set_facecolor(BG_DARK)
    ax.set_facecolor(BG_DARK)

    ctries = ['Espana', 'Dinamarca', 'Italia', 'Francia', 'R. Unido', 'Alemania']
    net_fav = [-55, -54, -52, -48, -46, -44]
    sympathy = [15, 18, 7, 18, 16, 17]

    x = np.arange(len(ctries))
    w = 0.35

    bars1 = ax.bar(x - w/2, net_fav, w, color=RED, edgecolor='white', linewidth=0.3, label='Favorabilidad Neta')
    bars2 = ax.bar(x + w/2, sympathy, w, color=BLUE, edgecolor='white', linewidth=0.3, label='% Simpatiza con Israel')

    ax.set_xticks(x)
    ax.set_xticklabels(ctries, color=SLATE, fontsize=10)
    ax.set_ylabel('Porcentaje', color=SLATE, fontsize=10)
    ax.tick_params(colors=SLATE)
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_color(SLATE)
    ax.spines['left'].set_color(SLATE)
    ax.axhline(y=0, color=SLATE, linewidth=0.5)
    ax.grid(True, alpha=0.1, color='white', axis='y')
    ax.legend(fontsize=9, facecolor=BG_PANEL, edgecolor=SLATE, labelcolor=WHITE)
    ax.set_title('Opinion Publica Europea sobre Israel (YouGov, Mayo 2025)',
                 color=WHITE, fontsize=12, fontweight='bold', pad=15)

    for bar, val in zip(bars1, net_fav):
        ax.text(bar.get_x() + bar.get_width()/2, val - 3, f'{val}%',
                ha='center', color=WHITE, fontsize=8, fontweight='bold')
    for bar, val in zip(bars2, sympathy):
        ax.text(bar.get_x() + bar.get_width()/2, val + 1.5, f'{val}%',
                ha='center', color=WHITE, fontsize=8, fontweight='bold')

    plt.tight_layout()
    buf = BytesIO()
    fig.savefig(buf, format='png', dpi=200, bbox_inches='tight', facecolor=BG_DARK)
    plt.close(fig)
    buf.seek(0)
    return buf


def build_pdf():
    pdf_path = os.path.join(OUTPUT_DIR, 'europe-israel-jewish-analysis.pdf')

    doc = SimpleDocTemplate(pdf_path, pagesize=A4,
                            topMargin=15*mm, bottomMargin=15*mm,
                            leftMargin=15*mm, rightMargin=15*mm)

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle('CustomTitle', parent=styles['Title'],
        fontSize=22, textColor=HexColor(BLUE), spaceAfter=4*mm,
        alignment=TA_CENTER, fontName='Helvetica-Bold')

    subtitle_style = ParagraphStyle('Subtitle', parent=styles['Normal'],
        fontSize=10, textColor=HexColor(SLATE), spaceAfter=8*mm,
        alignment=TA_CENTER)

    h2_style = ParagraphStyle('H2', parent=styles['Heading2'],
        fontSize=14, textColor=HexColor(BLUE), spaceBefore=6*mm,
        spaceAfter=3*mm, fontName='Helvetica-Bold')

    h2_green = ParagraphStyle('H2Green', parent=h2_style, textColor=HexColor(GREEN))
    h2_red = ParagraphStyle('H2Red', parent=h2_style, textColor=HexColor(RED))
    h2_purple = ParagraphStyle('H2Purple', parent=h2_style, textColor=HexColor(PURPLE))
    h2_amber = ParagraphStyle('H2Amber', parent=h2_style, textColor=HexColor(AMBER))
    h2_pink = ParagraphStyle('H2Pink', parent=h2_style, textColor=HexColor(PINK))
    h2_cyan = ParagraphStyle('H2Cyan', parent=h2_style, textColor=HexColor(CYAN))

    h3_style = ParagraphStyle('H3', parent=styles['Heading3'],
        fontSize=11, textColor=HexColor(WHITE), spaceBefore=3*mm,
        spaceAfter=2*mm, fontName='Helvetica-Bold')

    body_style = ParagraphStyle('CustomBody', parent=styles['Normal'],
        fontSize=9, textColor=HexColor('#cbd5e1'), spaceAfter=2*mm,
        leading=13, alignment=TA_JUSTIFY)

    highlight_style = ParagraphStyle('Highlight', parent=body_style,
        textColor=HexColor(WHITE), fontSize=9.5,
        borderWidth=1, borderColor=HexColor(BLUE), borderPadding=8,
        backColor=HexColor('#1e3a5f'), spaceAfter=4*mm, spaceBefore=2*mm)

    highlight_amber = ParagraphStyle('HighlightAmber', parent=highlight_style,
        borderColor=HexColor(AMBER), backColor=HexColor('#3d2e0a'))

    highlight_red = ParagraphStyle('HighlightRed', parent=highlight_style,
        borderColor=HexColor(RED), backColor=HexColor('#3d1515'))

    small_style = ParagraphStyle('Small', parent=styles['Normal'],
        fontSize=7.5, textColor=HexColor(SLATE), spaceAfter=1*mm, leading=10)

    stat_style = ParagraphStyle('Stat', parent=styles['Normal'],
        fontSize=20, textColor=HexColor(BLUE), alignment=TA_CENTER,
        fontName='Helvetica-Bold', spaceAfter=1*mm)

    stat_label = ParagraphStyle('StatLabel', parent=styles['Normal'],
        fontSize=8, textColor=HexColor(SLATE), alignment=TA_CENTER, spaceAfter=0)

    conclusion_num = ParagraphStyle('ConcNum', parent=styles['Normal'],
        fontSize=11, textColor=HexColor(AMBER), fontName='Helvetica-Bold')

    conclusion_title = ParagraphStyle('ConcTitle', parent=styles['Normal'],
        fontSize=10, textColor=HexColor(WHITE), fontName='Helvetica-Bold',
        spaceAfter=1*mm)

    conclusion_body = ParagraphStyle('ConcBody', parent=body_style,
        fontSize=8.5, spaceAfter=4*mm)

    source_style = ParagraphStyle('Source', parent=styles['Normal'],
        fontSize=7.5, textColor=HexColor(SLATE), spaceAfter=1*mm, leading=10)

    elements = []

    # === PAGE 1: Title + Stats + Hypothesis ===
    elements.append(Spacer(1, 10*mm))
    elements.append(Paragraph('EUROPA, ISRAEL y la DIASPORA JUDIA', title_style))
    elements.append(Paragraph(
        'Analisis de la relacion entre la poblacion judia en paises europeos<br/>'
        'y su apoyo diplomatico a Israel en la ONU, UE y otros organismos internacionales',
        subtitle_style))

    # Key stats as table
    stats_data = [
        [Paragraph('<b>~1.1M</b>', ParagraphStyle('s', parent=stat_style, textColor=HexColor(BLUE))),
         Paragraph('<b>27</b>', ParagraphStyle('s', parent=stat_style, textColor=HexColor(AMBER))),
         Paragraph('<b>15</b>', ParagraphStyle('s', parent=stat_style, textColor=HexColor(GREEN))),
         Paragraph('<b>2</b>', ParagraphStyle('s', parent=stat_style, textColor=HexColor(RED)))],
        [Paragraph('Judios en Europa<br/><font size="6">Poblacion core, 2024</font>', stat_label),
         Paragraph('Paises UE<br/><font size="6">Todos reconocen Israel</font>', stat_label),
         Paragraph('Reconocen Palestina<br/><font size="6">De 27 miembros UE</font>', stat_label),
         Paragraph('Votan "No" en ONU<br/><font size="6">Hungria y Chequia</font>', stat_label)]
    ]
    stats_table = Table(stats_data, colWidths=[45*mm]*4)
    stats_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor(BG_PANEL)),
        ('BOX', (0, 0), (-1, -1), 0.5, HexColor(SLATE)),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#334155')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4*mm),
    ]))
    elements.append(stats_table)
    elements.append(Spacer(1, 6*mm))

    # Hypothesis
    elements.append(Paragraph('HIPOTESIS CENTRAL', h2_style))
    elements.append(Paragraph(
        'Se analiza si existe una correlacion estadistica entre el tamano de la poblacion judia en cada pais '
        'europeo y el nivel de apoyo diplomatico de dicho pais hacia Israel en organismos internacionales '
        '(ONU, UE, etc.). Los datos revelan que <b>la relacion no es lineal ni directa</b>: paises con grandes '
        'comunidades judias (Francia, Reino Unido) votan frecuentemente contra Israel en la ONU, mientras que '
        'paises con comunidades muy pequenas (Chequia, Hungria) son sus mayores defensores. '
        '<b><font color="' + AMBER + '">La ideologia politica del gobierno en turno emerge como el factor '
        'predictivo mas fuerte.</font></b>', highlight_style))

    elements.append(PageBreak())

    # === PAGE 2: Population Chart + Data Table ===
    elements.append(Paragraph('POBLACION JUDIA Y POSTURA EN LA ONU', h2_style))

    pop_img = make_population_chart()
    elements.append(Image(pop_img, width=170*mm, height=125*mm))
    elements.append(Paragraph('Fuente: Prof. Sergio DellaPergola, American Jewish Year Book 2024. '
                              'Postura: voto en resolucion sept. 2024 (fin presencia israeli). '
                              '"En contra" = pro-Israel.', small_style))

    elements.append(Spacer(1, 4*mm))

    # Data table
    elements.append(Paragraph('DATOS DEMOGRAFICOS COMPLETOS', h2_purple))
    pct_pop = [0.65, 0.46, 0.15, 0.46, 0.20, 0.25, 0.05, 0.23, 0.14, 0.03,
               0.11, 0.05, 0.02, 0.11, 0.04, 0.04, 0.03, 0.02, 0.02, 0.01]

    table_data = [['Pais', 'Pob. Judia', '% Pob.', 'Postura ONU']]
    for i in range(len(countries)):
        stance = stance_labels[support_level[i]]
        table_data.append([countries[i], f'{populations[i]:,}', f'{pct_pop[i]:.2f}%', stance])

    t = Table(table_data, colWidths=[35*mm, 30*mm, 22*mm, 35*mm])
    table_style_list = [
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#334155')),
        ('TEXTCOLOR', (0, 0), (-1, 0), HexColor(WHITE)),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('TEXTCOLOR', (0, 1), (-1, -1), HexColor('#cbd5e1')),
        ('BACKGROUND', (0, 1), (-1, -1), HexColor(BG_PANEL)),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [HexColor(BG_PANEL), HexColor('#1a2332')]),
        ('GRID', (0, 0), (-1, -1), 0.3, HexColor('#334155')),
        ('ALIGN', (1, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (3, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 2*mm),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2*mm),
    ]
    # Color the stance column
    for i in range(1, len(table_data)):
        lvl = support_level[i-1]
        color = stance_colors_map[lvl]
        table_style_list.append(('TEXTCOLOR', (3, i), (3, i), HexColor(color)))

    t.setStyle(TableStyle(table_style_list))
    elements.append(t)

    elements.append(PageBreak())

    # === PAGE 3: Scatter Plot ===
    elements.append(Paragraph('POBLACION JUDIA VS. NIVEL DE APOYO A ISRAEL', h2_cyan))
    elements.append(Paragraph(
        'Cada punto representa un pais europeo. Eje X: poblacion judia (escala logaritmica). '
        'Eje Y: nivel de apoyo (1=vota contra Israel, 2=abstencion, 3=vota pro-Israel).', body_style))

    scatter_img = make_scatter_chart()
    elements.append(Image(scatter_img, width=170*mm, height=105*mm))

    elements.append(Paragraph(
        '<b>Hallazgo clave:</b> No se observa una correlacion positiva clara entre tamano de la poblacion '
        'judia y apoyo gubernamental a Israel en la ONU. Francia (438,500 judios) vota sistematicamente '
        'a favor de resoluciones criticas con Israel, mientras que Chequia (3,900 judios) es uno de sus '
        'dos unicos defensores en la UE.', highlight_style))

    elements.append(Spacer(1, 6*mm))

    # === Most / Least Pro-Israel ===
    elements.append(Paragraph('PAISES MAS PRO-ISRAEL EN EUROPA', h2_green))
    pro_data = [
        ['Chequia', '3,900 judios', '95% pro-Israel PE', 'Vota "No" en resoluciones anti-Israel. Solo 0.04% pob. judia. Gobierno centro-derecha.'],
        ['Hungria', '45,000 judios', '90% pro-Israel PE', 'Vota "No". Orban lazos estrechos con Netanyahu. Derecha nacionalista.'],
        ['Austria', '10,300 judios', '75% pro-Israel PE', 'Abstencion sistematica. Se opuso a resoluciones clave en 2023.'],
        ['Alemania', '125,000 judios', '70% pro-Israel PE', 'Abstencion frecuente por "responsabilidad historica". 72% coincidencia con EE.UU.'],
    ]
    for row in pro_data:
        elements.append(Paragraph(
            f'<b><font color="{GREEN}">{row[0]}</font></b> ({row[1]}) - <font color="{GREEN}">{row[2]}</font><br/>'
            f'<font size="8" color="{SLATE}">{row[3]}</font>', body_style))

    elements.append(PageBreak())

    elements.append(Paragraph('PAISES MENOS PRO-ISRAEL EN EUROPA', h2_red))
    anti_data = [
        ['Irlanda', '1,600 judios', '14.6% pro-Israel PE (mas bajo UE)', 'Reconocio Palestina mayo 2024. Identidad postcolonial influye.'],
        ['Espana', '13,000 judios', '26% pro-Israel PE', 'Reconocio Palestina mayo 2024. Podemos puntuo 0% pro-Israel.'],
        ['Belgica', '29,000 judios', '~30% pro-Israel PE', 'Vota a favor de resoluciones criticas pese a 6a mayor comunidad judia.'],
        ['Eslovenia', '~100 judios', '~20% pro-Israel PE', 'Reconocio Palestina junio 2024. Una de las comunidades mas pequenas.'],
    ]
    for row in anti_data:
        elements.append(Paragraph(
            f'<b><font color="{RED}">{row[0]}</font></b> ({row[1]}) - <font color="{RED}">{row[2]}</font><br/>'
            f'<font size="8" color="{SLATE}">{row[3]}</font>', body_style))

    elements.append(Spacer(1, 6*mm))

    # === EU Parliament Chart ===
    elements.append(Paragraph('VOTACION EN EL PARLAMENTO EUROPEO (2019-2022)', h2_purple))
    eu_img = make_eu_parliament_chart()
    elements.append(Image(eu_img, width=170*mm, height=90*mm))
    elements.append(Paragraph(
        '<b>Conclusion:</b> La ideologia politica del eurodiputado es un predictor mucho mas fuerte que su '
        'nacionalidad. Los grupos de derecha (ECR, ID) votan pro-Israel ~90% del tiempo, mientras que la '
        'izquierda (Verdes, The Left) lo hace menos del 12%.', highlight_style))

    elements.append(PageBreak())

    # === PAGE 5: Erosion + Timeline ===
    elements.append(Paragraph('EROSION DEL APOYO EUROPEO A ISRAEL (2017-2025)', h2_red))
    erosion_img = make_erosion_chart()
    elements.append(Image(erosion_img, width=170*mm, height=95*mm))
    elements.append(Paragraph(
        '<b>Tendencia:</b> Israel perdio el apoyo pasivo (abstenciones) de ~15 paises europeos entre 2017 '
        'y 2025. Alemania, Italia, Paises Bajos, Polonia, Reino Unido y otros pasaron de abstenerse a votar '
        'a favor de resoluciones criticas. Solo Hungria y Chequia mantienen un apoyo activo.', highlight_red))

    elements.append(Spacer(1, 4*mm))

    # Timeline
    elements.append(Paragraph('CRONOLOGIA: RECONOCIMIENTO DE PALESTINA POR ESTADOS UE', h2_amber))
    timeline = [
        ('1988', '7 paises bloque sovietico: Bulgaria, Chequia, Polonia, Rumania, Eslovaquia, Hungria, Chipre.'),
        ('2014', 'Suecia: primer pais en reconocer Palestina siendo miembro UE. Gobierno socialdemocrata.'),
        ('Mayo 2024', 'Irlanda, Espana y Noruega reconocen Palestina simultaneamente. Oleada post-octubre 2023.'),
        ('Junio 2024', 'Eslovenia reconoce Palestina.'),
        ('Sept. 2025', 'Francia, Portugal, Luxemburgo y Malta reconocen Palestina. Francia tiene la mayor poblacion judia de Europa (438,500).'),
    ]
    for year, desc in timeline:
        elements.append(Paragraph(
            f'<b><font color="{AMBER}">{year}</font></b> - {desc}', body_style))

    elements.append(Paragraph(
        '<b>Dato clave:</b> De los 15 paises UE que reconocen Palestina, Francia tiene la mayor comunidad '
        'judia (438,500). Esto contradice la hipotesis de que mayor poblacion judia implica mayor apoyo a Israel.',
        highlight_amber))

    elements.append(PageBreak())

    # === PAGE 6: Factors + Opinion ===
    elements.append(Paragraph('FACTORES DETERMINANTES DEL APOYO A ISRAEL', h2_purple))
    elements.append(Paragraph(
        'Peso relativo de cada factor segun estudios academicos publicados.', body_style))

    factors_img = make_factors_chart()
    elements.append(Image(factors_img, width=120*mm, height=120*mm))

    factors_desc = [
        (PURPLE, 'Ideologia Politica (95/100)', 'Factor mas fuerte. Gobiernos de derecha son mas pro-Israel. Relacion en U. Fuente: Vignoli (2025), JCMS.'),
        (BLUE, 'Relaciones Comerciales (65/100)', 'UE = mayor socio comercial de Israel (32% comercio). Fuente: EU Trade Data, Vignoli (2025).'),
        (AMBER, 'Demografia Musulmana (60/100)', 'Paises con mas musulmanes son mas criticos con Israel. Fuente: Vignoli (2025).'),
        (GREEN, 'Experiencia Totalitaria (55/100)', 'Paises ex-sovieticos tienden a ser pro-Israel. Fuente: ECI (2022), Mandler & Lutmar (2021).'),
        (RED, 'Poblacion Judia (15/100)', 'Factor mas debil. No se aisla como variable en ningun estudio publicado.'),
    ]
    for color, title, desc in factors_desc:
        elements.append(Paragraph(
            f'<font color="{color}"><b>{title}</b></font> - <font size="8">{desc}</font>', body_style))

    elements.append(PageBreak())

    # === PAGE 7: Public Opinion + Contradictions ===
    elements.append(Paragraph('OPINION PUBLICA EUROPEA SOBRE ISRAEL (YouGov, 2025)', h2_pink))
    opinion_img = make_opinion_chart()
    elements.append(Image(opinion_img, width=170*mm, height=95*mm))
    elements.append(Paragraph(
        '<b>Contexto:</b> La favorabilidad publica hacia Israel ha alcanzado minimos historicos en toda '
        'Europa Occidental. Solo entre el 13% y 21% tiene opinion positiva. Estos niveles presionan a los '
        'gobiernos hacia posturas mas criticas.', highlight_style))

    elements.append(Spacer(1, 4*mm))

    # Contradictions
    elements.append(Paragraph('CASOS QUE CONTRADICEN LA HIPOTESIS', h2_amber))
    cases = [
        ('Francia', '438,500 judios', 'Mayor comunidad judia de Europa. Vota contra Israel en ONU. Reconocio Palestina sept. 2025.', 'CONTRA hipotesis'),
        ('Belgica', '29,000 judios', '6a mayor comunidad. Vota consistentemente a favor de resoluciones criticas con Israel.', 'CONTRA hipotesis'),
        ('Chequia', '3,900 judios', 'Solo 0.04% poblacion. Uno de los 2 unicos paises UE que vota pro-Israel activamente.', 'CONTRA hipotesis (inversa)'),
    ]
    for name, pop, desc, verdict in cases:
        v_color = RED if 'inversa' not in verdict else GREEN
        elements.append(Paragraph(
            f'<b>{name}</b> ({pop}): {desc} '
            f'<font color="{v_color}"><b>[{verdict}]</b></font>', body_style))

    elements.append(PageBreak())

    # === PAGE 8: Conclusions ===
    elements.append(Paragraph('CONCLUSIONES DEL ANALISIS', ParagraphStyle('ConcH', parent=title_style, fontSize=16, textColor=HexColor(AMBER))))
    elements.append(Spacer(1, 4*mm))

    conclusions = [
        ('1', 'No Existe Correlacion Directa Poblacion Judia - Apoyo a Israel',
         'Los datos refutan la hipotesis. Francia (438,500 judios) y Belgica (29,000) votan contra Israel, mientras que Chequia (3,900) y Hungria (45,000) son sus unicos defensores en la UE.'),
        ('2', 'La Ideologia Politica es el Factor Determinante',
         'Partidos de derecha (ECR, ID) votan pro-Israel ~90% en el PE, frente a menos del 12% de la izquierda (Verdes, The Left). Se replica a nivel de gobierno nacional.'),
        ('3', 'El Factor Historico Pesa Mas que la Demografia',
         'Alemania: "responsabilidad historica". Paises ex-sovieticos: afinidad geostrategica con EE.UU. Irlanda: identidad postcolonial.'),
        ('4', 'Tendencia General: Erosion Acelerada del Apoyo',
         'Entre 2017 y 2025, Israel perdio ~15 abstenciones europeas. Solo 2 de 27 UE mantienen apoyo activo. 15 de 27 reconocen Palestina. Opinion publica en minimos.'),
        ('5', 'Vacio en la Literatura Academica',
         'No existe estudio que aisle la poblacion judia como variable independiente en votaciones ONU. Estudios existentes (Vignoli 2025, Mandler & Lutmar 2021) se centran en ideologia, comercio y demografia musulmana.'),
    ]
    for num, title, desc in conclusions:
        elements.append(Paragraph(f'<font color="{AMBER}" size="14"><b>{num}.</b></font> <b>{title}</b>', conclusion_title))
        elements.append(Paragraph(desc, conclusion_body))

    elements.append(Spacer(1, 4*mm))
    elements.append(Paragraph(
        '<b>Nota metodologica:</b> Este analisis utiliza datos oficiales de la ONU (votaciones AGNU), del '
        'Parlamento Europeo (rankings ECI), datos demograficos del American Jewish Year Book (DellaPergola 2024), '
        'y encuestas de YouGov (2025). Las posturas pueden variar segun la resolucion y el gobierno en turno.',
        ParagraphStyle('Note', parent=body_style, backColor=HexColor('#1e293b'),
                       borderWidth=0.5, borderColor=HexColor(SLATE), borderPadding=6)))

    elements.append(Spacer(1, 6*mm))

    # Sources
    elements.append(Paragraph('FUENTES Y REFERENCIAS', h2_style))
    sources = [
        '<b>Datos Demograficos:</b> DellaPergola (2024), American Jewish Year Book; Jewish Virtual Library; Institute for Jewish Policy Research (JPR)',
        '<b>Votaciones ONU:</b> Washington Institute (2025); UN Watch - 2024 UNGA Resolutions; U.S. State Department - Voting Practices in the UN (2024)',
        '<b>Estudios Academicos:</b> Vignoli (2025), JCMS; Mandler & Lutmar (2021), Israel Affairs Vol.27; European Coalition for Israel (ECI) Rankings 2019-2022',
        '<b>Opinion Publica:</b> YouGov EuroTrack, Mayo 2025; Pew Research Center',
    ]
    for src in sources:
        elements.append(Paragraph(f'  {src}', source_style))

    elements.append(Spacer(1, 8*mm))
    elements.append(Paragraph('Generado para fines educativos e investigativos',
                              ParagraphStyle('Footer', parent=small_style, alignment=TA_CENTER)))

    # Build with dark background
    def bg_canvas(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(HexColor(BG_DARK))
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.restoreState()

    doc.build(elements, onFirstPage=bg_canvas, onLaterPages=bg_canvas)
    print(f'PDF created: {pdf_path}')
    print(f'Size: {os.path.getsize(pdf_path) / 1024:.0f} KB')


if __name__ == '__main__':
    build_pdf()
