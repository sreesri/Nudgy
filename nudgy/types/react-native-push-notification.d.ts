declare module "react-native-push-notification" {
  interface Notification {
    id?: string;
    message: string;
    date?: Date;
    allowWhileIdle?: boolean;
    repeatType?: string;
  }

  interface NotificationConfig {
    onRegister?: (token: { os: string; token: string }) => void;
    onNotification: (notification: Notification) => void;
    permissions: {
      alert: boolean;
      badge: boolean;
      sound: boolean;
    };
    popInitialNotification: boolean;
    requestPermissions: boolean;
  }

  interface ChannelConfig {
    channelId: string;
    channelName: string;
    channelDescription: string;
    playSound: boolean;
    soundName: string;
    importance: number;
    vibrate: boolean;
  }

  const PushNotification: {
    configure: (config: NotificationConfig) => void;
    localNotificationSchedule: (notification: Notification) => void;
    cancelLocalNotification: (id: string) => void;
    createChannel: (
      config: ChannelConfig,
      callback: (created: boolean) => void
    ) => void;
  };

  export default PushNotification;
}
