import { jsPDF } from 'jspdf';
import type { Recording } from '../platform/types';

type PdfInput = { analysis: unknown; recording: Recording; locale: string };
type Language = 'en' | 'pt' | 'es';

const COPY: Record<Language, Record<string, string>> = {
  en: {
    report: 'Conversation intelligence report', recorded: 'Recorded', generated: 'Generated',
    analysisModes: 'Analysis lenses', evidenceQuality: 'Evidence quality', limitations: 'Limitations',
    interview: 'Interview analysis', languageClass: 'Language lesson analysis', meeting: 'Meeting analysis',
    summary: 'Executive summary', page: 'Page', of: 'of', title: 'Title', executiveBrief: 'Executive brief', statement: 'Statement',
    level: 'Level', lessonContext: 'Lesson context', objective: 'Objective', learnerSpeakers: 'Learners', learnerProfiles: 'Learner profiles', cefr: 'CEFR', strengths: 'Strengths', priorities: 'Priorities', signal: 'Signal',
    outcome: 'Outcome', whatChanged: 'What changed', decisions: 'Decisions', decision: 'Decision', owner: 'Owner', actionItems: 'Action items', task: 'Task', dueDate: 'Due date', risks: 'Risks', risk: 'Risk', basis: 'Basis', openQuestions: 'Open questions',
  },
  pt: {
    report: 'Relatório de inteligência da conversa', recorded: 'Gravado em', generated: 'Gerado em',
    analysisModes: 'Perspectivas de análise', evidenceQuality: 'Qualidade das evidências', limitations: 'Limitações',
    interview: 'Análise de entrevista', languageClass: 'Análise da aula de idioma', meeting: 'Análise da reunião',
    summary: 'Resumo executivo', page: 'Página', of: 'de', title: 'Título', executiveBrief: 'Resumo executivo', statement: 'Síntese',
    level: 'Nível', lessonContext: 'Contexto da aula', objective: 'Objetivo', learnerSpeakers: 'Alunos', learnerProfiles: 'Perfis dos alunos', cefr: 'CEFR', strengths: 'Pontos fortes', priorities: 'Prioridades', signal: 'Sinal observado',
    outcome: 'Resultado', whatChanged: 'O que mudou', decisions: 'Decisões', decision: 'Decisão', owner: 'Responsável', actionItems: 'Pontos de ação', task: 'Tarefa', dueDate: 'Prazo', risks: 'Riscos', risk: 'Risco', basis: 'Base', openQuestions: 'Perguntas em aberto',
  },
  es: {
    report: 'Informe de inteligencia de la conversación', recorded: 'Grabado', generated: 'Generado',
    analysisModes: 'Perspectivas de análisis', evidenceQuality: 'Calidad de la evidencia', limitations: 'Limitaciones',
    interview: 'Análisis de entrevista', languageClass: 'Análisis de la clase de idioma', meeting: 'Análisis de la reunión',
    summary: 'Resumen ejecutivo', page: 'Página', of: 'de', title: 'Título', executiveBrief: 'Resumen ejecutivo', statement: 'Síntesis',
    level: 'Nivel', lessonContext: 'Contexto de la clase', objective: 'Objetivo', learnerSpeakers: 'Alumnos', learnerProfiles: 'Perfiles de alumnos', cefr: 'CEFR', strengths: 'Fortalezas', priorities: 'Prioridades', signal: 'Señal observada',
    outcome: 'Resultado', whatChanged: 'Qué cambió', decisions: 'Decisiones', decision: 'Decisión', owner: 'Responsable', actionItems: 'Acciones', task: 'Tarea', dueDate: 'Fecha', risks: 'Riesgos', risk: 'Riesgo', basis: 'Base', openQuestions: 'Preguntas abiertas',
  },
};

const VALUE_COPY: Record<Language, Record<string, string>> = {
  en: { true: 'Yes', false: 'No', interview: 'Interview', language: 'Language', meeting: 'Meeting', high: 'High', medium: 'Medium', low: 'Low', explicit: 'Explicit', inferred: 'Inferred' },
  pt: { true: 'Sim', false: 'Não', interview: 'Entrevista', language: 'Idioma', meeting: 'Reunião', high: 'Alta', medium: 'Média', low: 'Baixa', explicit: 'Explícita', inferred: 'Inferida' },
  es: { true: 'Sí', false: 'No', interview: 'Entrevista', language: 'Idioma', meeting: 'Reunión', high: 'Alta', medium: 'Media', low: 'Baja', explicit: 'Explícita', inferred: 'Inferida' },
};

const TITLE_KEYS = ['title', 'name', 'speaker', 'question', 'task', 'decision', 'topic', 'focus', 'signal', 'insight'];

function languageFor(locale: string): Language {
  const normalized = locale.toLowerCase();
  return normalized.startsWith('pt') ? 'pt' : normalized.startsWith('es') ? 'es' : 'en';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function humanizeKey(key: string, copy: Record<string, string>): string {
  if (copy[key]) return copy[key];
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replace(/^./, (character) => character.toUpperCase());
}

function scalarText(value: unknown, language: Language): string {
  if (typeof value === 'boolean') return VALUE_COPY[language][String(value)];
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'string') {
    const clean = value.trim();
    return VALUE_COPY[language][clean.toLowerCase()] || clean;
  }
  return '';
}

function safeFileName(value: string): string {
  const normalized = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
  return `${normalized || 'voxa-conversation'}-report.pdf`;
}

export function createAnalysisPdf({ analysis, recording, locale }: PdfInput): Blob {
  const language = languageFor(locale);
  const copy = COPY[language];
  const doc = new jsPDF({ format: 'a4', unit: 'mm', compress: true, putOnlyUsedFonts: true });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 18;
  const contentWidth = pageWidth - (marginX * 2);
  const bottomLimit = pageHeight - 19;
  let y = 18;

  const ensureSpace = (height: number) => {
    if (y + height <= bottomLimit) return;
    doc.addPage();
    y = 18;
  };

  const addText = (
    text: string,
    options: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gapAfter?: number } = {},
  ) => {
    const clean = text.trim();
    if (!clean) return;
    const size = options.size ?? 9.5;
    const indent = options.indent ?? 0;
    const width = contentWidth - indent;
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(options.color ?? [42, 44, 41]));
    const lines = doc.splitTextToSize(clean, width) as string[];
    const lineHeight = size * 0.44;
    ensureSpace((lines.length * lineHeight) + (options.gapAfter ?? 2));
    doc.text(lines, marginX + indent, y);
    y += (lines.length * lineHeight) + (options.gapAfter ?? 2);
  };

  const addHeading = (text: string, depth: number) => {
    const size = depth <= 1 ? 16 : depth === 2 ? 12 : 10;
    const gap = depth <= 1 ? 5 : 3;
    ensureSpace((size * 0.8) + gap + 12);
    if (depth <= 1 && y > 22) {
      doc.setDrawColor(210, 212, 208);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 5;
    }
    addText(text, { size, bold: true, color: [30, 32, 29], gapAfter: gap });
  };

  const renderNode = (key: string, value: unknown, depth: number) => {
    if (value === null || value === undefined || value === '') return;
    const label = humanizeKey(key, copy);
    const scalar = scalarText(value, language);
    if (scalar) {
      addText(`${label}: ${scalar}`, { indent: Math.min(depth, 3) * 3.5, gapAfter: 1.6 });
      return;
    }

    if (Array.isArray(value)) {
      if (!value.length) return;
      addHeading(label, Math.min(depth + 1, 3));
      value.forEach((item, index) => {
        const itemScalar = scalarText(item, language);
        if (itemScalar) {
          addText(`• ${itemScalar}`, { indent: Math.min(depth + 1, 3) * 3.5, gapAfter: 1.4 });
          return;
        }
        if (!isRecord(item)) return;
        const titleKey = TITLE_KEYS.find((candidate) => scalarText(item[candidate], language));
        const title = titleKey ? scalarText(item[titleKey], language) : `${label} ${index + 1}`;
        addText(title, { bold: true, indent: Math.min(depth + 1, 3) * 3.5, gapAfter: 1.8 });
        Object.entries(item).forEach(([childKey, childValue]) => {
          if (childKey !== titleKey) renderNode(childKey, childValue, depth + 2);
        });
      });
      return;
    }

    if (isRecord(value)) {
      const entries = Object.entries(value).filter(([, childValue]) => childValue !== null && childValue !== undefined && childValue !== '');
      if (!entries.length) return;
      addHeading(label, Math.min(depth + 1, 3));
      entries.forEach(([childKey, childValue]) => renderNode(childKey, childValue, depth + 1));
    }
  };

  doc.setProperties({
    title: `${recording.name} — Voxa`,
    subject: copy.report,
    author: 'Voxa',
    creator: 'Voxa Web',
  });
  addText('Voxa.', { size: 12, bold: true, color: [39, 58, 44], gapAfter: 8 });
  addText(copy.report.toUpperCase(), { size: 8, bold: true, color: [104, 111, 103], gapAfter: 4 });
  addText(recording.name || 'Voxa conversation', { size: 24, bold: true, color: [26, 28, 25], gapAfter: 7 });

  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
  if (recording.createdAt) addText(`${copy.recorded}: ${dateFormatter.format(new Date(recording.createdAt))}`, { color: [100, 104, 99] });
  addText(`${copy.generated}: ${dateFormatter.format(new Date())}`, { color: [100, 104, 99], gapAfter: 7 });

  if (isRecord(analysis)) {
    Object.entries(analysis).forEach(([key, value]) => renderNode(key, value, 0));
  } else {
    addText(String(analysis ?? ''));
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(220, 222, 218);
    doc.line(marginX, pageHeight - 14, pageWidth - marginX, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(118, 122, 116);
    doc.text('Voxa', marginX, pageHeight - 9);
    doc.text(`${copy.page} ${page} ${copy.of} ${pageCount}`, pageWidth - marginX, pageHeight - 9, { align: 'right' });
  }

  return doc.output('blob');
}

export async function downloadAnalysisPdf(input: PdfInput): Promise<string> {
  const fileName = safeFileName(input.recording.name);
  const blob = createAnalysisPdf(input);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  return fileName;
}
