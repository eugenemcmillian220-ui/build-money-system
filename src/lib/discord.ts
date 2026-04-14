import { serverEnv } from "./env";

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
  timestamp?: string;
}

export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export class DiscordNotifier {
  private botToken = serverEnv.DISCORD_TOKEN;
  private defaultChannel = serverEnv.DISCORD_CHANNEL_ID;
  private webhookUrl = serverEnv.DISCORD_WEBHOOK_URL;

  /**
   * Send a message via Discord Bot API
   */
  async sendMessage(message: DiscordMessage, channelId?: string): Promise<boolean> {
    const targetChannel = channelId || this.defaultChannel;
    if (!this.botToken || !targetChannel) {
      console.warn("[Discord] Bot Token or Channel ID missing. Skipping.");
      return false;
    }

    try {
      const response = await fetch(`https://discord.com/api/v10/channels/${targetChannel}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bot ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error("[Discord] API Error:", data);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Discord] Failed to send message:", error);
      return false;
    }
  }

  /**
   * Send a message via Discord Webhook
   */
  async sendWebhook(message: DiscordMessage): Promise<boolean> {
    if (!this.webhookUrl) return false;

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        console.error("[Discord] Webhook Error:", await response.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Discord] Webhook failed:", error);
      return false;
    }
  }

  /**
   * Notify Swarm Event to Discord
   */
  async notifySwarmEvent(agent: string, event: string, status: "success" | "error" | "info") {
    const color = status === "success" ? 0x22c55e : status === "error" ? 0xef4444 : 0x3b82f6;
    const icon = status === "success" ? "✅" : status === "error" ? "🚨" : "🤖";

    const embed: DiscordEmbed = {
      title: `${icon} Swarm Alert`,
      description: `**Agent:** ${agent}\n**Event:** ${event}`,
      color: color,
      footer: { text: "Sovereign Forge Swarm | Phase 19: DAO" },
      timestamp: new Date().toISOString()
    };

    const message: DiscordMessage = { embeds: [embed] };

    // Try webhook first, then bot API
    if (this.webhookUrl) {
      await this.sendWebhook(message);
    } else if (this.botToken && this.defaultChannel) {
      await this.sendMessage(message);
    }
  }
}

export const discordNotifier = new DiscordNotifier();
