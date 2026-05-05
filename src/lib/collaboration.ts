import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Real-Time Collaboration Module
 * Handles presence and shared generation state for teams
 */
export class CollaborationManager {
  private supabase = createClient();

  /**
   * Joins a collaborative generation room for a project
   */
  joinRoom(projectId: string, onUpdate: (payload: { delta: string }) => void) {
    const channel = this.supabase.channel(`project:${projectId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: projectId },
      },
    });

    channel
      .on("broadcast", { event: "delta" }, ({ payload }: { payload: { delta: string } }) => {
        onUpdate(payload);
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Joined collaboration room: ${projectId}`);
        }
      });

    return channel;
  }

  /**
   * Broadcasts a generation delta to other members in the room
   */
  broadcastDelta(channel: RealtimeChannel, delta: string) {
    channel.send({
      type: "broadcast",
      event: "delta",
      payload: { delta },
    });
  }
}

export const collaborationManager = new CollaborationManager();
