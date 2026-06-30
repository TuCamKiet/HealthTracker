import * as Notifications from "expo-notifications";

// Notification handler must be registered once
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// NOTE: Reminders are no longer scheduled on a fixed clock here.
// Water and rest reminders fire from DashboardScreen when the user
// actually crosses a step milestone (2,000 / 5,000 steps), and the
// "stand up" reminder fires after 3,600s of zero step-count change.
// This file just requests permission and clears any stale scheduled
// notifications left over from earlier app versions.
export async function requestPermissionsAndSchedule() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    console.log("Notification permission:", status);

    if (status !== "granted") {
      console.log("Notification permission denied");
      return;
    }

    // Clear any leftover fixed-interval schedules from older app versions
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.log("Notification setup error:", error);
  }
}
