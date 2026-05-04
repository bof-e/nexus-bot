class CooldownManager {
  constructor() {
    this._store = new Map();
  }

  isOnCooldown(commandName, userId, cooldownSeconds) {
    const cmd = this._store.get(commandName);
    if (!cmd) return { onCooldown: false };

    const last = cmd.get(userId);
    if (!last) return { onCooldown: false };

    const elapsed = Date.now() - last;
    const cooldownMs = cooldownSeconds * 1000;

    if (elapsed < cooldownMs) {
      return { onCooldown: true, remaining: Math.ceil((cooldownMs - elapsed) / 1000) };
    }
    return { onCooldown: false };
  }

  set(commandName, userId) {
    if (!this._store.has(commandName)) {
      this._store.set(commandName, new Map());
    }
    this._store.get(commandName).set(userId, Date.now());
  }

  cleanup(maxAgeMs = 24 * 3600 * 1000) {
    const now = Date.now();
    for (const [cmd, users] of this._store) {
      for (const [uid, ts] of users) {
        if (now - ts > maxAgeMs) users.delete(uid);
      }
      if (users.size === 0) this._store.delete(cmd);
    }
  }
}

module.exports = new CooldownManager();