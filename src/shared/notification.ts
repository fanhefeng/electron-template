/** Payload sent by renderer via IPC to trigger a system notification. */
export interface NotificationPayload {
  title: string;
  body: string;
}
