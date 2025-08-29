import Database from 'better-sqlite3';
import path from 'path';
import { Link } from './types';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

const createTables = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS links (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      snippet TEXT NOT NULL,
      source TEXT NOT NULL,
      category TEXT NOT NULL,
      topic TEXT NOT NULL,
      embedding BLOB,
      feedback TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX IF NOT EXISTS idx_links_topic ON links(topic);
    CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
    CREATE INDEX IF NOT EXISTS idx_links_feedback ON links(feedback);
  `);

  // Add thumbnail column if it doesn't exist (migration)
  try {
    db.exec(`ALTER TABLE links ADD COLUMN thumbnail TEXT;`);
  } catch (error) {
    // Column already exists, ignore error
    console.log('Thumbnail column already exists or migration not needed');
  }
};

createTables();

export const insertLink = (link: Omit<Link, 'id' | 'created_at'>) => {
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO links (title, url, snippet, source, category, topic, thumbnail, embedding)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const embeddingBuffer = link.embedding ? Buffer.from(link.embedding.buffer) : null;
  
  return stmt.run(
    link.title,
    link.url,
    link.snippet,
    link.source,
    link.category,
    link.topic,
    link.thumbnail,
    embeddingBuffer
  );
};

export const updateFeedback = (linkId: number, feedback: 'like' | 'discard') => {
  const stmt = db.prepare('UPDATE links SET feedback = ? WHERE id = ?');
  return stmt.run(feedback, linkId);
};

export const getLinksByTopic = (topic: string): Link[] => {
  const stmt = db.prepare('SELECT * FROM links WHERE topic = ? ORDER BY created_at DESC');
  const rows = stmt.all(topic) as any[];
  
  return rows.map(row => ({
    ...row,
    embedding: row.embedding ? new Float32Array(row.embedding) : undefined
  }));
};

export const getLikedLinks = (topic: string): Link[] => {
  const stmt = db.prepare(`
    SELECT * FROM links 
    WHERE topic = ? AND feedback = 'like' 
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(topic) as any[];
  
  return rows.map(row => ({
    ...row,
    embedding: row.embedding ? new Float32Array(row.embedding) : undefined
  }));
};

export const getDislikedLinks = (topic: string): Link[] => {
  const stmt = db.prepare(`
    SELECT * FROM links 
    WHERE topic = ? AND feedback = 'discard' 
    ORDER BY created_at DESC
  `);
  const rows = stmt.all(topic) as any[];
  
  return rows.map(row => ({
    ...row,
    embedding: row.embedding ? new Float32Array(row.embedding) : undefined
  }));
};

export const getLinkById = (id: number): Link | undefined => {
  const stmt = db.prepare('SELECT * FROM links WHERE id = ?');
  const row = stmt.get(id) as any;
  
  if (!row) return undefined;
  
  return {
    ...row,
    embedding: row.embedding ? new Float32Array(row.embedding) : undefined
  };
};

export default db;