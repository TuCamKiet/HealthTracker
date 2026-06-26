import * as Notifications from "expo-notifications";

// Handler phải được đăng ký 1 lần
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestPermissionsAndSchedule() {
  try {
    const { status } = await Notifications.requestPermissionsAsync();

    console.log("Permission:", status);

    if (status !== "granted") {
      console.log("Quyền thông báo bị từ chối!");
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    const waterId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "💧 Nạp nước cho cơ thể!",
        body: "Đã 1.5 tiếng trôi qua, hãy uống 150-200ml nước để duy trì trao đổi chất nhé.",
        data: { type: "WATER_REMINDER" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5400, // 90 phút
        repeats: true, //!IOS CẦN >= 60s MỚI DUYỆT YÊU CẦU THÔNG BÁO NÀY
      },
    });

    console.log("Water Notification:", waterId);

    const moveId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🏃‍♂️ Đứng dậy vươn vai nào!",
        body: "Bạn đã ngồi 1 tiếng rồi. Hãy đi dạo vài bước để máu lưu thông tốt hơn.",
        data: { type: "MOVE_REMINDER" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 3600, // 60 phút
        repeats: true, //!IOS CẦN >= 60s MỚI DUYỆT YÊU CẦU THÔNG BÁO NÀY
      },
    });

    console.log("Move Notification:", moveId);

    const all = await Notifications.getAllScheduledNotificationsAsync();

    console.log("Scheduled:", all);
  } catch (error) {
    console.log("Notification Error:", error);
  }
}
