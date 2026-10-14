import type { SyllabusCourse } from '../types/syllabus.ts';

export const CURATED_SYLLABUS_TEMPLATES: SyllabusCourse[] = [
  {
    id: 'template-software-eng',
    title: 'Full-Stack Software Engineering',
    category: 'learning',
    createdAt: 1735689600000,
    updatedAt: 1735689600000,
    subjects: [
      {
        id: 'fs-frontend',
        title: 'Frontend Engineering',
        color: '#B7CDEA',
        units: [
          {
            id: 'fs-fe-u1',
            title: 'Modern Web Architecture',
            topics: [
              { id: 'top-fsfe-1', title: 'React Hooks, Lifecycle & Custom Hooks', completed: false, revisionCount: 0 },
              { id: 'top-fsfe-2', title: 'State Management & Concurrency Models', completed: false, revisionCount: 0 },
              { id: 'top-fsfe-3', title: 'Web Performance, CWV & Code Splitting', completed: false, revisionCount: 0 },
              { id: 'top-fsfe-4', title: 'Accessibility (a11y) & Semantic Markup', completed: false, revisionCount: 0 },
            ],
          },
        ],
      },
      {
        id: 'fs-backend',
        title: 'Backend & Systems',
        color: '#E8CBA9',
        units: [
          {
            id: 'fs-be-u1',
            title: 'Distributed Systems & Data',
            topics: [
              { id: 'top-fsbe-1', title: 'REST & GraphQL Schema Design', completed: false, revisionCount: 0 },
              { id: 'top-fsbe-2', title: 'Relational Database Indexing & Transactions', completed: false, revisionCount: 0 },
              { id: 'top-fsbe-3', title: 'Caching Strategies, Redis & Invalidation', completed: false, revisionCount: 0 },
              { id: 'top-fsbe-4', title: 'Idempotency, Queues & Event-Driven Patterns', completed: false, revisionCount: 0 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'template-ai-ml',
    title: 'Machine Learning & AI Foundations',
    category: 'learning',
    createdAt: 1735689600000,
    updatedAt: 1735689600000,
    subjects: [
      {
        id: 'ai-theory',
        title: 'Math & Machine Learning',
        color: '#CCBDE7',
        units: [
          {
            id: 'ai-u1',
            title: 'Core Foundations',
            topics: [
              { id: 'top-ai-1', title: 'Linear Algebra, Eigenvalues & SVD', completed: false, revisionCount: 0 },
              { id: 'top-ai-2', title: 'Probability, Bayes Rule & Maximum Likelihood', completed: false, revisionCount: 0 },
              { id: 'top-ai-3', title: 'Gradient Descent & Optimization Dynamics', completed: false, revisionCount: 0 },
            ],
          },
          {
            id: 'ai-u2',
            title: 'Deep Learning & Transformers',
            topics: [
              { id: 'top-ai-4', title: 'Backpropagation & Computational Graphs', completed: false, revisionCount: 0 },
              { id: 'top-ai-5', title: 'Multi-Head Self-Attention & Transformer Blocks', completed: false, revisionCount: 0 },
              { id: 'top-ai-6', title: 'Reinforcement Learning from Human Feedback (RLHF)', completed: false, revisionCount: 0 },
            ],
          },
        ],
      },
    ],
  },
];

export function createBlankSyllabusCourse(title = 'Custom Focus Syllabus', category: SyllabusCourse['category'] = 'custom'): SyllabusCourse {
  const now = Date.now();
  const cid = `course-${now}-${Math.random().toString(36).substring(2, 7)}`;
  return {
    id: cid,
    title,
    category,
    createdAt: now,
    updatedAt: now,
    subjects: [
      {
        id: `sub-${now}-1`,
        title: 'Primary Topic',
        color: '#B7CDEA',
        units: [
          {
            id: `unit-${now}-1`,
            title: 'Module 1',
            topics: [
              {
                id: `top-${now}-1`,
                title: 'Overview & Fundamentals',
                completed: false,
                revisionCount: 0,
              },
            ],
          },
        ],
      },
    ],
  };
}
