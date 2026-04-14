import { serverEnv } from "./env";

export interface SlackMessage {
  text: string;
  channel?: string;
  blocks?: any[];
}

export class SlackNotifier {
  private botToken = serverEnv.SLACK_BOT_TOKEN;
  private defaultChannel = serverEnv.SLACK_CHANNEL_ID;
  private webhookUrl = serverEnv.SLACK_WEBHOOK_URL;

  /**
   * Send a message to Slack using the Bot Token
   */
  async sendMessage(message: SlackMessage): Promise<boolean> {
    if (!this.botToken) {
      console.warn("[Slack] Bot Token missing. Skipping notification.");
      return false;
    }

    const channel = message.channel || this.defaultChannel;
    if (!channel) {
      console.warn("[Slack] No channel ID provided. Skipping notification.");
      return false;
    }

    try {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel,
          text: message.text,
          blocks: message.blocks,
        }),
      });

      const data = await response.json();
      if (!data.ok) {
        console.error("[Slack] API Error:", data.error);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[Slack] Failed to send message:", error);
      return false;
    }
  }

  /**
   * Send a message via Webhook (Alternative)
   */
  async sendWebhook(text: string): Promise<boolean> {
    if (!this.webhookUrl) return false;

    try {
      await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      return true;
    } catch (error) {
      console.error("[Slack] Webhook failed:", error);
      return false;
    }
  }

  /**
   * Notify Swarm Event
   */
  async notifySwarmEvent(agent: string, event: string, status: "success" | "error" | "info") {
    const icon = status === "success" ? "✅" : status === "error" ? "🚨" : "🤖";
    const text = `${icon} *[Swarm Alert]* \n*Agent:* ${agent}\n*Event:* ${event}`;
    
    await this.sendMessage({
      text,
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: text
          }
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: `*Sovereign Forge Swarm* | Phase ${status === "error" ? "7: Healer" : "19: DAO"}`
            }
          ]
        }
      ]
    });
  }
}

export const slackNotifier = new SlackNotifier();
