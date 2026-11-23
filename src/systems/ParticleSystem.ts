interface PixelParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

/**
 * Lightweight pixel particle & floating world-text system for tactile farming feedback.
 */
export class ParticleSystem {
  private readonly particles: PixelParticle[] = [];
  private readonly texts: FloatingText[] = [];

  spawnDirtBurst(worldX: number, worldY: number): void {
    const colors = ['#9d6236', '#7a4722', '#c78c52', '#5c3317'];
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: worldX + (Math.random() - 0.5) * 8,
        y: worldY + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 44,
        vy: -22 - Math.random() * 28,
        gravity: 110,
        size: Math.random() < 0.5 ? 2 : 1.5,
        color: colors[i % colors.length],
        life: 0.38 + Math.random() * 0.18,
        maxLife: 0.56,
      });
    }
  }

  spawnWaterSplash(worldX: number, worldY: number): void {
    const colors = ['#59b8f0', '#96e0ff', '#d4f5ff', '#3a8ec7'];
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: worldX + (Math.random() - 0.5) * 10,
        y: worldY - 2 + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 38,
        vy: -18 - Math.random() * 24,
        gravity: 95,
        size: 1.5,
        color: colors[i % colors.length],
        life: 0.34 + Math.random() * 0.16,
        maxLife: 0.5,
      });
    }
  }

  spawnHarvestSparkle(worldX: number, worldY: number): void {
    const colors = ['#ffe56e', '#fff7ba', '#8de052', '#ffaa47'];
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12 + Math.random() * 0.3;
      const speed = 18 + Math.random() * 22;
      this.particles.push({
        x: worldX,
        y: worldY - 4,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 14,
        gravity: 35,
        size: 2,
        color: colors[i % colors.length],
        life: 0.45 + Math.random() * 0.2,
        maxLife: 0.65,
      });
    }
  }

  spawnHeartBurst(worldX: number, worldY: number): void {
    const colors = ['#ff6b8b', '#ff9db5', '#ffe17d', '#ff4770'];
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: worldX + (Math.random() - 0.5) * 10,
        y: worldY - 12 + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 20,
        vy: -24 - Math.random() * 18,
        gravity: 10,
        size: 2.5,
        color: colors[i % colors.length],
        life: 0.6 + Math.random() * 0.25,
        maxLife: 0.85,
      });
    }
  }

  spawnFloatingText(worldX: number, worldY: number, text: string, color = '#fff6d1'): void {
    this.texts.push({
      x: worldX,
      y: worldY - 8,
      vy: -16,
      text,
      color,
      life: 1.15,
      maxLife: 1.15,
    });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
    }
  }

  renderWorld(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }

  renderFloatingTexts(
    ctx: CanvasRenderingContext2D,
    cameraRenderX: number,
    cameraRenderY: number,
    zoom: number
  ): void {
    ctx.save();
    ctx.font = '900 13px "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      const alpha = Math.max(0, Math.min(1, (t.life / t.maxLife) * 1.4));
      const sx = Math.round((t.x - cameraRenderX) * zoom);
      const sy = Math.round((t.y - cameraRenderY) * zoom);
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#3b1f12';
      ctx.strokeText(t.text, sx, sy);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, sx, sy);
    }
    ctx.restore();
  }
}
