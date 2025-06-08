import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Reminder {
  id: string;
  name: string;
  time: Date;
  repeatCount: number;
}

const AppContent: React.FC = () => {
  const insets = useSafeAreaInsets();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [name, setName] = useState("");
  const [repeatCount, setRepeatCount] = useState("");
  const [time, setTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    loadReminders();
    configureNotifications();
  }, []);

  const configureNotifications = async () => {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert(
        "Permission required",
        "Please enable notifications to use this app"
      );
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("reminders", {
        name: "Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF231F7C",
      });
    }
  };

  const scheduleNotification = async (reminder: Reminder) => {
    const now = new Date();
    const reminderTime = new Date(reminder.time);
    reminderTime.setDate(now.getDate());

    // Schedule notifications for today based on repeat count
    for (let i = 0; i < reminder.repeatCount; i++) {
      const fireDate = new Date(reminderTime.getTime() + i * 3600 * 1000); // Spread by 1 hour
      if (fireDate > now) {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Reminder",
            body: reminder.name,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 1.5 * 60 * 60,
            repeats: true,
          },
        });
      }
    }
  };

  const loadReminders = async () => {
    try {
      const storedReminders = await AsyncStorage.getItem("reminders");
      if (storedReminders) {
        setReminders(
          JSON.parse(storedReminders).map((r: any) => ({
            ...r,
            time: new Date(r.time),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading reminders:", error);
    }
  };

  const saveReminders = async (updatedReminders: Reminder[]) => {
    try {
      await AsyncStorage.setItem("reminders", JSON.stringify(updatedReminders));
    } catch (error) {
      console.error("Error saving reminders:", error);
    }
  };

  const addReminder = async () => {
    if (
      !name ||
      !repeatCount ||
      isNaN(parseInt(repeatCount)) ||
      parseInt(repeatCount) < 1
    ) {
      Alert.alert(
        "Error",
        "Please enter a valid name and repeat count (1 or more)."
      );
      return;
    }

    const newReminder: Reminder = {
      id: Math.random().toString(),
      name,
      time,
      repeatCount: parseInt(repeatCount),
    };

    const updatedReminders = [...reminders, newReminder];
    setReminders(updatedReminders);
    await saveReminders(updatedReminders);
    await scheduleNotification(newReminder);

    // Reset form
    setName("");
    setRepeatCount("");
    setTime(new Date());
  };

  const deleteReminder = async (id: string) => {
    const updatedReminders = reminders.filter((r) => r.id !== id);
    setReminders(updatedReminders);
    await saveReminders(updatedReminders);
    await Notifications.cancelAllScheduledNotificationsAsync();
    // Reschedule remaining notifications
    for (const reminder of updatedReminders) {
      await scheduleNotification(reminder);
    }
  };

  const onTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View
        style={[
          styles.container,
          { paddingTop: Platform.OS === "android" ? insets.top + 10 : 0 },
        ]}
      >
        <Text style={styles.title}>Daily Reminders</Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Reminder Name"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Daily Repeat Count"
            value={repeatCount}
            keyboardType="numeric"
            onChangeText={setRepeatCount}
          />
          <View style={styles.buttonContainer}>
            <View style={styles.timePickerButton}>
              <Button
                title="Select Time"
                onPress={() => setShowTimePicker(true)}
              />
            </View>
            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display="default"
                onChange={onTimeChange}
              />
            )}
            <View style={styles.addButton}>
              <Button title="Add Reminder" onPress={addReminder} />
            </View>
          </View>
        </View>

        <View style={styles.listContainer}>
          <FlatList
            data={reminders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.reminderItem}>
                <Text style={styles.reminderText}>
                  {item.name} at {item.time.toLocaleTimeString()} (x
                  {item.repeatCount}/day)
                </Text>
                <View style={styles.deleteButton}>
                  <Button
                    title="Delete"
                    onPress={() => deleteReminder(item.id)}
                  />
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const App: React.FC = () => {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 30,
    textAlign: "center",
    color: "#333",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  buttonContainer: {
    marginBottom: 20,
  },
  timePickerButton: {
    marginBottom: 15,
  },
  addButton: {
    marginBottom: 25,
  },
  reminderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  reminderText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  deleteButton: {
    marginLeft: 10,
  },
  listContainer: {
    flex: 1,
    marginTop: 10,
  },
  formContainer: {
    marginBottom: 20,
  },
});

export default App;
