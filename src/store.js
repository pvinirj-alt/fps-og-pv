import { DatabaseSync } from 'node:sqlite';

export class DeliveryStore {
  constructor(filename) {
    this.db = new DatabaseSync(filename);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS deliveries (
        guild TEXT NOT NULL,
        member TEXT NOT NULL,
        state TEXT NOT NULL,
        updated TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (guild, member)
      );
    `);
  }

  claim(guild, member, explicitRetry = false) {
    const result = this.db.prepare(`
      INSERT INTO deliveries (guild, member, state) VALUES (?, ?, 'pending')
      ON CONFLICT (guild, member) DO UPDATE SET state = 'pending', updated = CURRENT_TIMESTAMP
      WHERE deliveries.state = 'blocked' AND ? = 1
    `).run(guild, member, Number(explicitRetry));
    return result.changes === 1;
  }

  finish(guild, member, state) {
    this.db.prepare(`UPDATE deliveries SET state = ?, updated = CURRENT_TIMESTAMP
      WHERE guild = ? AND member = ?`).run(state, guild, member);
  }

  status(guild, member) {
    return this.db.prepare('SELECT state FROM deliveries WHERE guild = ? AND member = ?')
      .get(guild, member)?.state;
  }

  close() {
    this.db.close();
  }
}
