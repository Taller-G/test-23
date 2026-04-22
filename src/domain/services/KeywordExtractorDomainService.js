/**
 * KeywordExtractorDomainService
 *
 * Extracts meaningful keywords from a raw job-description text by:
 *   1. Tokenising the text (split on non-alphanumeric boundaries).
 *   2. Removing stopwords in both English and Spanish.
 *   3. Discarding tokens that are too short (< 2 chars) or purely numeric.
 *   4. Deduplicating (case-insensitive) and returning lowercase tokens.
 *
 * Multi-word technical phrases (e.g. "machine learning", "node.js",
 * "ci/cd") are also captured via a curated phrase-pattern pass that runs
 * before single-token extraction, so phrase keywords take precedence.
 *
 * Rules:
 *  • Input must be a non-empty string.
 *  • Returns an array of unique, lowercased keyword strings.
 *  • Order is: phrases first (in order of appearance), then single tokens.
 *  • If the text yields no keywords an empty array is returned (not an error).
 *
 * Layer: Domain → Services
 * Imports: domain only (DomainException)
 */

import { DomainException } from '../exceptions/DomainException.js';

// ── Stopword lists ────────────────────────────────────────────────────────────

/**
 * English stopwords — high-frequency function words that carry no
 * discriminating signal for ATS keyword matching.
 * @type {Set<string>}
 */
const STOPWORDS_EN = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'nor', 'so', 'yet', 'for',
  'in', 'on', 'at', 'to', 'of', 'up', 'as', 'by', 'is', 'it', 'be',
  'do', 'if', 'no', 'not', 'are', 'was', 'were', 'has', 'had', 'have',
  'did', 'does', 'can', 'may', 'will', 'shall', 'could', 'would',
  'should', 'must', 'might', 'that', 'this', 'these', 'those', 'with',
  'from', 'into', 'than', 'then', 'when', 'where', 'which', 'who',
  'whom', 'whose', 'what', 'how', 'why', 'all', 'any', 'both', 'each',
  'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
  'own', 'too', 'very', 'just', 'also', 'about', 'after', 'before',
  'between', 'during', 'out', 'off', 'over', 'under', 'again', 'further',
  'once', 'here', 'there', 'while', 'although', 'because', 'since',
  'until', 'unless', 'whether', 'though', 'even', 'our', 'your', 'their',
  'its', 'my', 'his', 'her', 'we', 'you', 'they', 'he', 'she', 'i',
  'me', 'him', 'us', 'them', 'been', 'being', 'able', 'need', 'want',
  'use', 'using', 'used', 'make', 'made', 'take', 'taken', 'get', 'got',
  'give', 'given', 'go', 'work', 'working', 'new', 'good', 'well',
  'high', 'large', 'great', 'strong', 'key', 'etc', 'ie', 'eg',
  'including', 'include', 'included', 'within', 'across', 'toward',
  'towards', 'through', 'throughout', 'upon', 'per', 'via', 'plus',
  'various', 'related', 'based', 'required', 'provide', 'ensure',
  'support', 'understanding', 'knowledge', 'minimum', 'least', 'years',
  'year', 'role', 'roles', 'position', 'positions', 'candidate',
  'candidates', 'opportunity', 'team', 'company', 'organization',
  'responsibilities', 'responsibility', 'requirement', 'requirements',
  'qualification', 'qualifications', 'preferred', 'desired', 'must',
  'will', 'help', 'helps', 'join', 'looking', 'seeking', 'apply',
  'application', 'please', 'send', 'submit', 'following', 'above',
  'below', 'able', 'responsible', 'ability', 'interest', 'interests',
]);

/**
 * Spanish stopwords — same principle, Spanish function words.
 * @type {Set<string>}
 */
const STOPWORDS_ES = new Set([
  'a', 'al', 'algo', 'algunas', 'algunos', 'ante', 'antes', 'como',
  'con', 'contra', 'cual', 'cuando', 'de', 'del', 'desde', 'donde',
  'durante', 'e', 'el', 'ella', 'ellas', 'ellos', 'en', 'entre', 'era',
  'erais', 'eran', 'eras', 'eres', 'es', 'esa', 'esas', 'ese', 'eso',
  'esos', 'esta', 'estas', 'este', 'esto', 'estos', 'estoy', 'han',
  'has', 'hasta', 'hay', 'he', 'la', 'las', 'le', 'les', 'lo', 'los',
  'me', 'mi', 'mis', 'muy', 'ni', 'no', 'nos', 'nosotros', 'nuestra',
  'nuestro', 'o', 'os', 'para', 'pero', 'por', 'que', 'quien', 'quienes',
  'se', 'ser', 'si', 'sin', 'sobre', 'su', 'sus', 'también', 'tanto',
  'te', 'tiene', 'tienen', 'tu', 'tus', 'un', 'una', 'unas', 'uno',
  'unos', 'vos', 'vosotras', 'vosotros', 'vuestra', 'vuestro', 'y',
  'ya', 'yo', 'fue', 'ser', 'son', 'somos', 'soy', 'era', 'ha', 'he',
  'hemos', 'han', 'fue', 'sido', 'siendo', 'tener', 'tengo', 'tiene',
  'tenemos', 'tener', 'todos', 'todo', 'cada', 'otro', 'otros', 'esta',
  'mas', 'más', 'menos', 'aqui', 'aquí', 'ahi', 'allí', 'entonces',
  'porque', 'pues', 'aunque', 'luego', 'mientras', 'mediante', 'hacia',
  'bajo', 'junto', 'tras', 'según', 'segun', 'dentro', 'fuera',
  'través', 'buen', 'buena', 'bien', 'gran', 'grande', 'alto', 'nuevo',
  'nueva', 'trabajo', 'empresa', 'equipo', 'años', 'año', 'vez',
  'parte', 'área', 'cargo', 'puesto', 'perfil', 'experiencia',
  'conocimiento', 'conocimientos', 'habilidad', 'habilidades',
  'requisito', 'requisitos', 'funciones', 'función', 'responsabilidad',
  'responsabilidades', 'buscamos', 'buscamos', 'ofrecemos', 'necesita',
  'requiere', 'excelente', 'excelentes', 'importante', 'favor',
  'enviar', 'postular', 'siguiente', 'siguientes',
]);

/** Combined stopword set (EN + ES). */
const STOPWORDS = new Set([...STOPWORDS_EN, ...STOPWORDS_ES]);

// ── Curated multi-word technical phrase patterns ──────────────────────────────

/**
 * Ordered list of multi-word technical phrases to detect before tokenisation.
 * Using lowercase literal strings for fast includes-based matching.
 * Listed longest / most-specific first where there is overlap.
 *
 * @type {string[]}
 */
const MULTI_WORD_PHRASES = [
  // AI / ML
  'machine learning', 'deep learning', 'natural language processing',
  'computer vision', 'reinforcement learning', 'large language model',
  'large language models', 'generative ai', 'artificial intelligence',
  'neural network', 'neural networks', 'data science', 'data engineering',
  'data analysis', 'data analytics', 'business intelligence',
  // Cloud & DevOps
  'amazon web services', 'google cloud platform', 'microsoft azure',
  'google cloud', 'azure devops', 'continuous integration',
  'continuous deployment', 'continuous delivery', 'infrastructure as code',
  'site reliability engineering', 'site reliability', 'service mesh',
  'container orchestration', 'event driven', 'event-driven',
  // Architecture
  'micro services', 'microservices', 'micro-services',
  'domain driven design', 'domain-driven design',
  'test driven development', 'test-driven development',
  'behavior driven development', 'behavior-driven development',
  'clean architecture', 'hexagonal architecture',
  'restful api', 'rest api', 'graphql api',
  'message queue', 'message broker', 'event sourcing',
  // Languages & Frameworks
  'node.js', 'next.js', 'nuxt.js', 'vue.js', 'react native',
  'angular js', 'angular.js', 'express.js', 'nest.js', 'nestjs',
  'spring boot', 'asp.net', 'asp.net core', '.net core', '.net framework',
  'ruby on rails', 'django rest', 'fast api', 'fastapi',
  'type script', 'typescript',
  // Databases
  'sql server', 'microsoft sql', 'nosql database', 'time series',
  'graph database', 'in memory', 'redis cache',
  // Practices
  'agile methodology', 'agile methodologies', 'scrum master',
  'product owner', 'version control', 'code review', 'pair programming',
  'unit testing', 'integration testing', 'end to end', 'end-to-end',
  'ci/cd', 'ci / cd',
  // Soft skills (EN)
  'problem solving', 'problem-solving', 'critical thinking',
  'time management', 'project management', 'team player',
  'communication skills', 'leadership skills', 'cross functional',
  'cross-functional',
  // Soft skills (ES)
  'trabajo en equipo', 'gestión de proyectos', 'resolución de problemas',
  'toma de decisiones', 'orientado a resultados', 'pensamiento crítico',
  'comunicación efectiva',
];

// ── Public class ──────────────────────────────────────────────────────────────

export class KeywordExtractorDomainService {
  /**
   * Extract meaningful keywords from raw job-description text.
   * The algorithm runs two passes:
   *   Pass 1 — scan for curated multi-word phrases (order-sensitive literal match).
   *   Pass 2 — tokenise the remaining text, filter stopwords and noise.
   *
   * @param {string} jobDescriptionText — raw text of the job description
   * @returns {string[]} array of unique, lowercased keywords (phrases + tokens)
   * @throws {DomainException} if input is not a string
   */
  extract(jobDescriptionText) {
    if (typeof jobDescriptionText !== 'string') {
      throw new DomainException('Job description text must be a string.');
    }

    const normalised = jobDescriptionText.toLowerCase();

    // Pass 1: capture multi-word phrases
    const { phrases, textAfterPhrases } = this.#extractPhrases(normalised);

    // Pass 2: single-token extraction from remaining text
    const tokens = this.#extractTokens(textAfterPhrases);

    // Merge: phrases first, then tokens; deduplicate respecting insertion order
    const seen = new Set(phrases);
    const result = [...phrases];

    for (const token of tokens) {
      if (!seen.has(token)) {
        seen.add(token);
        result.push(token);
      }
    }

    return result;
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Scan the normalised text for known multi-word phrases.
   * Replaces each found phrase with a placeholder so its constituent words
   * are not re-tokenised individually in pass 2.
   *
   * @param {string} normalisedText
   * @returns {{ phrases: string[], textAfterPhrases: string }}
   */
  #extractPhrases(normalisedText) {
    const phrases = [];
    let text = normalisedText;
    const seen = new Set();

    for (const phrase of MULTI_WORD_PHRASES) {
      if (text.includes(phrase) && !seen.has(phrase)) {
        phrases.push(phrase);
        seen.add(phrase);
        // Replace all occurrences with a space so constituent words are
        // not picked up again by the token pass
        text = text.split(phrase).join(' ');
      }
    }

    return { phrases, textAfterPhrases: text };
  }

  /**
   * Tokenise the text and return cleaned, filtered, unique single tokens.
   *
   * Token filtering rules:
   *  • Minimum 2 characters long (after stripping leading/trailing punctuation).
   *  • Not purely numeric (e.g. "2024", "3").
   *  • Not in the combined EN+ES stopword list.
   *  • Keeps tokens with internal punctuation that makes sense in tech contexts
   *    (e.g. "c++", "c#", "node.js", ".net", "aws").
   *
   * @param {string} text — already lowercased
   * @returns {string[]}
   */
  #extractTokens(text) {
    // Split on whitespace and common delimiters (keep internal dots, hyphens, +, #)
    const raw = text.split(/[\s,;:!?()[\]{}<>"'`|\\/@%^&*=~]+/);

    const seen = new Set();
    const tokens = [];

    for (let token of raw) {
      // Strip leading/trailing punctuation that doesn't carry meaning
      token = token.replace(/^[.\-_]+|[.\-_]+$/g, '');

      if (token.length < 2) continue;
      if (/^\d+$/.test(token)) continue; // purely numeric
      if (STOPWORDS.has(token)) continue;

      if (!seen.has(token)) {
        seen.add(token);
        tokens.push(token);
      }
    }

    return tokens;
  }
}
