import React, { useState, useEffect } from "react";
import {
  Clock,
  Calendar,
  Send,
  User,
  Plus,
  Trash2,
  Edit3,
  Wifi,
  WifiOff,
} from "lucide-react";

const InternTimeLogger = () => {
  const [internInfo, setInternInfo] = useState({
    name: "",
    email: "",
    supervisor: "",
    internType: "first-semester",
  });

  const [currentEntry, setCurrentEntry] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "mentorship",
    activity: "",
    timeIn: "",
    timeOut: "",
    totalHours: 0,
    notes: "",
  });

  const [timeEntries, setTimeEntries] = useState([]);
  const [isTimedIn, setIsTimedIn] = useState(false);
  const [activeView, setActiveView] = useState("profile");
  const [editingEntry, setEditingEntry] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  // PWA Installation
  useEffect(() => {
    let deferredPrompt;

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setShowInstallPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
    };
  }, []);

  // Online/Offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load saved data on app start
  useEffect(() => {
    try {
      const savedEntries = localStorage.getItem("centralTimeEntries");
      const savedInternInfo = localStorage.getItem("centralInternInfo");
      const savedCurrentEntry = localStorage.getItem("centralCurrentEntry");

      if (savedEntries) {
        setTimeEntries(JSON.parse(savedEntries));
      }
      if (savedInternInfo) {
        setInternInfo(JSON.parse(savedInternInfo));
      }
      if (savedCurrentEntry) {
        const parsed = JSON.parse(savedCurrentEntry);
        setCurrentEntry(parsed);
      }
    } catch (error) {
      console.log("Error loading saved data:", error);
    }
  }, []);

  // Save data whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("centralTimeEntries", JSON.stringify(timeEntries));
    } catch (error) {
      console.log("Error saving time entries:", error);
    }
  }, [timeEntries]);

  useEffect(() => {
    try {
      localStorage.setItem("centralInternInfo", JSON.stringify(internInfo));
    } catch (error) {
      console.log("Error saving intern info:", error);
    }
  }, [internInfo]);

  useEffect(() => {
    try {
      localStorage.setItem("centralCurrentEntry", JSON.stringify(currentEntry));
    } catch (error) {
      console.log("Error saving current entry:", error);
    }
  }, [currentEntry]);

  const calculateHours = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return 0;
    const start = new Date(`2000-01-01T${timeIn}`);
    const end = new Date(`2000-01-01T${timeOut}`);
    const diff = (end - start) / (1000 * 60 * 60);
    return Math.max(0, parseFloat(diff.toFixed(1)));
  };

  const handleTimeIn = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setCurrentEntry((prev) => {
      const updated = { ...prev, timeIn: timeString };
      if (updated.timeOut) {
        updated.totalHours = calculateHours(timeString, updated.timeOut);
      }
      return updated;
    });
    setIsTimedIn(true);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  };

  const handleTimeOut = () => {
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 5);
    setCurrentEntry((prev) => {
      const updated = { ...prev, timeOut: timeString };
      if (updated.timeIn) {
        updated.totalHours = calculateHours(updated.timeIn, timeString);
      }
      return updated;
    });
    setIsTimedIn(false);

    // Haptic feedback on mobile
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
  };

  const addTimeEntry = () => {
    if (
      !currentEntry.timeIn ||
      !currentEntry.timeOut ||
      !currentEntry.activity.trim()
    ) {
      alert(
        "Please fill in all required fields (Time In, Time Out, and Activity)"
      );
      return;
    }

    const newEntry = {
      ...currentEntry,
      id: editingEntry ? editingEntry.id : Date.now(),
      totalHours: calculateHours(currentEntry.timeIn, currentEntry.timeOut),
    };

    if (editingEntry) {
      setTimeEntries((prev) =>
        prev.map((entry) => (entry.id === editingEntry.id ? newEntry : entry))
      );
      setEditingEntry(null);
    } else {
      setTimeEntries((prev) => [...prev, newEntry]);
    }

    setCurrentEntry({
      date: new Date().toISOString().split("T")[0],
      category: "mentorship",
      activity: "",
      timeIn: "",
      timeOut: "",
      totalHours: 0,
      notes: "",
    });

    // Success haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  };

  const editEntry = (entry) => {
    setCurrentEntry(entry);
    setEditingEntry(entry);
    setActiveView("logger");
  };

  const deleteEntry = (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      setTimeEntries((prev) => prev.filter((entry) => entry.id !== id));
    }
  };

  const getCurrentWeekEntries = () => {
    const now = new Date();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    return timeEntries.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfWeek;
    });
  };

  const generateEmailReport = () => {
    const weekEntries = getCurrentWeekEntries();
    const categories = {
      mentorship: "Mentorship Hours",
      service: "Service Volunteer Hours",
      support: "Support Ministry Hours",
      coursework: "Canvas Coursework",
    };

    const summary = {};
    Object.keys(categories).forEach((cat) => {
      summary[cat] = {
        hours: weekEntries
          .filter((entry) => entry.category === cat)
          .reduce((sum, entry) => sum + entry.totalHours, 0),
        entries: weekEntries.filter((entry) => entry.category === cat).length,
      };
    });

    const totalHours = Object.values(summary).reduce(
      (sum, cat) => sum + cat.hours,
      0
    );

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date) =>
      date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    let emailBody = `Weekly Time Report - ${formatDate(
      weekStart
    )} to ${formatDate(weekEnd)}\n\n`;
    emailBody += `Intern: ${internInfo.name}\n`;
    emailBody += `Email: ${internInfo.email}\n`;
    emailBody += `Supervisor: ${internInfo.supervisor}\n`;
    emailBody += `Intern Type: ${
      internInfo.internType === "first-semester"
        ? "First Semester"
        : "Returning"
    }\n\n`;

    emailBody += `WEEKLY SUMMARY:\n`;
    emailBody += `Total Hours: ${totalHours.toFixed(1)} hours\n\n`;

    Object.entries(summary).forEach(([cat, data]) => {
      emailBody += `${categories[cat]}: ${data.hours.toFixed(1)} hours (${
        data.entries
      } entries)\n`;
    });

    emailBody += `\nDETAILED ENTRIES:\n`;
    emailBody += `${"=".repeat(50)}\n`;

    weekEntries
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach((entry) => {
        emailBody += `\nDate: ${new Date(entry.date).toLocaleDateString()}\n`;
        emailBody += `Category: ${categories[entry.category]}\n`;
        emailBody += `Activity: ${entry.activity}\n`;
        emailBody += `Time: ${entry.timeIn} - ${
          entry.timeOut
        } (${entry.totalHours.toFixed(1)} hours)\n`;
        if (entry.notes) emailBody += `Notes: ${entry.notes}\n`;
        emailBody += `${"-".repeat(30)}\n`;
      });

    const subject = `Weekly Time Report - ${
      internInfo.name
    } - Week of ${formatDate(weekStart)}`;
    const mailtoLink = `mailto:mmaine@centralassembly.org?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(emailBody)}`;

    window.open(mailtoLink);
  };

  // Quick action for clock in/out
  const QuickClockButton = () => (
    <button
      onClick={isTimedIn ? handleTimeOut : handleTimeIn}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        width: "64px",
        height: "64px",
        borderRadius: "50%",
        backgroundColor: isTimedIn ? "#ef4444" : "#10b981",
        color: "white",
        border: "none",
        boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
        fontSize: "18px",
        fontWeight: "bold",
        cursor: "pointer",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.3s ease",
      }}
    >
      {isTimedIn ? "OUT" : "IN"}
    </button>
  );

  // Mobile styles
  const mobileStyles = {
    container: {
      minHeight: "100vh",
      backgroundColor: "#f3f4f6",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      paddingBottom: "100px", // Space for floating button
    },
    header: {
      background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
      color: "white",
      padding: "20px 0",
      position: "sticky",
      top: 0,
      zIndex: 100,
    },
    headerContent: {
      maxWidth: "100%",
      margin: "0 auto",
      padding: "0 16px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    title: {
      fontSize: window.innerWidth < 768 ? "20px" : "28px",
      fontWeight: "bold",
      margin: "0",
    },
    subtitle: {
      color: "#bfdbfe",
      marginTop: "4px",
      fontSize: window.innerWidth < 768 ? "14px" : "16px",
    },
    statusBadge: {
      display: "flex",
      alignItems: "center",
      gap: "4px",
      padding: "4px 8px",
      borderRadius: "12px",
      backgroundColor: isOnline
        ? "rgba(16, 185, 129, 0.2)"
        : "rgba(239, 68, 68, 0.2)",
      fontSize: "12px",
    },
    nav: {
      backgroundColor: "white",
      borderBottom: "1px solid #e5e7eb",
      padding: "0",
      position: "sticky",
      top: window.innerWidth < 768 ? "80px" : "88px",
      zIndex: 99,
    },
    navContent: {
      display: "flex",
      justifyContent: "space-around",
      padding: "0 8px",
    },
    navButton: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      padding: "12px 8px",
      border: "none",
      background: "none",
      fontSize: "12px",
      fontWeight: "500",
      cursor: "pointer",
      flex: 1,
      gap: "4px",
      borderBottom: "3px solid transparent",
    },
    mainContent: {
      padding: "16px",
    },
    card: {
      backgroundColor: "white",
      padding: window.innerWidth < 768 ? "16px" : "24px",
      borderRadius: "12px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      marginBottom: "16px",
    },
    cardTitle: {
      fontSize: "18px",
      fontWeight: "bold",
      color: "#1f2937",
      marginBottom: "16px",
      display: "flex",
      alignItems: "center",
      gap: "8px",
    },
    inputGroup: {
      marginBottom: "20px",
    },
    label: {
      display: "block",
      fontSize: "16px",
      fontWeight: "500",
      color: "#374151",
      marginBottom: "8px",
    },
    input: {
      width: "100%",
      padding: "16px",
      border: "2px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "16px", // Prevents zoom on iOS
      outline: "none",
      backgroundColor: "white",
      transition: "border-color 0.2s",
      boxSizing: "border-box",
    },
    inputFocus: {
      borderColor: "#3b82f6",
    },
    select: {
      width: "100%",
      padding: "16px",
      border: "2px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "16px",
      backgroundColor: "white",
      outline: "none",
      boxSizing: "border-box",
    },
    textarea: {
      width: "100%",
      padding: "16px",
      border: "2px solid #d1d5db",
      borderRadius: "8px",
      fontSize: "16px",
      resize: "vertical",
      outline: "none",
      minHeight: "100px",
      backgroundColor: "white",
      boxSizing: "border-box",
    },
    button: {
      padding: "16px 24px",
      border: "none",
      borderRadius: "8px",
      fontSize: "16px",
      fontWeight: "600",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      transition: "all 0.2s",
      minHeight: "48px", // Touch target
      justifyContent: "center",
    },
    buttonPrimary: {
      backgroundColor: "#3b82f6",
      color: "white",
    },
    buttonSuccess: {
      backgroundColor: "#10b981",
      color: "white",
    },
    buttonDanger: {
      backgroundColor: "#ef4444",
      color: "white",
    },
    buttonDisabled: {
      backgroundColor: "#9ca3af",
      color: "#6b7280",
      cursor: "not-allowed",
    },
    timeGrid: {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "12px",
    },
    timeInputGroup: {
      display: "flex",
      gap: "8px",
      alignItems: "end",
    },
    nowButton: {
      padding: "16px",
      fontSize: "14px",
      minWidth: "60px",
      height: "54px",
    },
  };

  return (
    <div style={mobileStyles.container}>
      {/* Header */}
      <div style={mobileStyles.header}>
        <div style={mobileStyles.headerContent}>
          <div>
            <h1 style={mobileStyles.title}>Central Assembly</h1>
            <p style={mobileStyles.subtitle}>Time Logger</p>
          </div>
          <div style={mobileStyles.statusBadge}>
            {isOnline ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{isOnline ? "Online" : "Offline"}</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={mobileStyles.nav}>
        <div style={mobileStyles.navContent}>
          {[
            { id: "profile", label: "Profile", icon: User },
            { id: "logger", label: "Log Time", icon: Clock },
            { id: "summary", label: "Summary", icon: Calendar },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              style={{
                ...mobileStyles.navButton,
                borderBottomColor:
                  activeView === id ? "#3b82f6" : "transparent",
                color: activeView === id ? "#3b82f6" : "#6b7280",
              }}
            >
              <Icon size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={mobileStyles.mainContent}>
        {/* Profile View */}
        {activeView === "profile" && (
          <div style={mobileStyles.card}>
            <h2 style={mobileStyles.cardTitle}>
              <User size={24} />
              Intern Profile
            </h2>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Full Name *</label>
              <input
                type="text"
                value={internInfo.name}
                onChange={(e) =>
                  setInternInfo((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Enter your full name"
                style={mobileStyles.input}
              />
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Email Address *</label>
              <input
                type="email"
                value={internInfo.email}
                onChange={(e) =>
                  setInternInfo((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="yourname@centralassembly.org"
                style={mobileStyles.input}
              />
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Supervisor *</label>
              <input
                type="text"
                value={internInfo.supervisor}
                onChange={(e) =>
                  setInternInfo((prev) => ({
                    ...prev,
                    supervisor: e.target.value,
                  }))
                }
                placeholder="Enter supervisor name"
                style={mobileStyles.input}
              />
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Intern Type *</label>
              <select
                value={internInfo.internType}
                onChange={(e) =>
                  setInternInfo((prev) => ({
                    ...prev,
                    internType: e.target.value,
                  }))
                }
                style={mobileStyles.select}
              >
                <option value="first-semester">First Semester Intern</option>
                <option value="returning">Returning Intern</option>
              </select>
            </div>

            <div
              style={{
                padding: "16px",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                border: "2px solid #3b82f6",
                marginTop: "20px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px 0",
                  color: "#1e40af",
                  fontSize: "16px",
                }}
              >
                Weekly Hour Requirements:
              </h3>
              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    margin: "8px 0",
                  }}
                >
                  <span>Mentorship Hours:</span>
                  <span style={{ fontWeight: "600" }}>1-2 hours</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    margin: "8px 0",
                  }}
                >
                  <span>Service Volunteer:</span>
                  <span style={{ fontWeight: "600" }}>3-6 hours</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    margin: "8px 0",
                  }}
                >
                  <span>Support Ministry:</span>
                  <span style={{ fontWeight: "600" }}>3-6 hours</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    margin: "8px 0",
                  }}
                >
                  <span>Canvas Coursework:</span>
                  <span style={{ fontWeight: "600" }}>2-3 hours</span>
                </div>
                <div
                  style={{
                    marginTop: "16px",
                    paddingTop: "12px",
                    borderTop: "2px solid #3b82f6",
                    fontWeight: "bold",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "16px",
                  }}
                >
                  <span>Total Weekly Minimum:</span>
                  <span>10 hours</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Log Time View */}
        {activeView === "logger" && (
          <div style={mobileStyles.card}>
            <h2 style={mobileStyles.cardTitle}>
              <Clock size={24} />
              {editingEntry ? "Edit Entry" : "Log Time"}
            </h2>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Date *</label>
              <input
                type="date"
                value={currentEntry.date}
                onChange={(e) =>
                  setCurrentEntry((prev) => ({ ...prev, date: e.target.value }))
                }
                style={mobileStyles.input}
              />
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Category *</label>
              <select
                value={currentEntry.category}
                onChange={(e) =>
                  setCurrentEntry((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                style={mobileStyles.select}
              >
                <option value="mentorship">Mentorship Hours</option>
                <option value="service">Service Volunteer Hours</option>
                <option value="support">Support Ministry Hours</option>
                <option value="coursework">Canvas Coursework</option>
              </select>
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Activity Description *</label>
              <input
                type="text"
                value={currentEntry.activity}
                onChange={(e) =>
                  setCurrentEntry((prev) => ({
                    ...prev,
                    activity: e.target.value,
                  }))
                }
                placeholder="e.g., Sunday morning service"
                style={mobileStyles.input}
              />
            </div>

            <div style={mobileStyles.timeGrid}>
              <div style={mobileStyles.inputGroup}>
                <label style={mobileStyles.label}>Time In *</label>
                <div style={mobileStyles.timeInputGroup}>
                  <input
                    type="time"
                    value={currentEntry.timeIn}
                    onChange={(e) => {
                      const newTimeIn = e.target.value;
                      setCurrentEntry((prev) => {
                        const updated = { ...prev, timeIn: newTimeIn };
                        if (updated.timeOut) {
                          updated.totalHours = calculateHours(
                            newTimeIn,
                            updated.timeOut
                          );
                        }
                        return updated;
                      });
                    }}
                    style={{ ...mobileStyles.input, flex: 1 }}
                  />
                  <button
                    onClick={handleTimeIn}
                    disabled={isTimedIn}
                    style={{
                      ...mobileStyles.button,
                      ...mobileStyles.nowButton,
                      ...(isTimedIn
                        ? mobileStyles.buttonDisabled
                        : mobileStyles.buttonSuccess),
                    }}
                  >
                    Now
                  </button>
                </div>
              </div>

              <div style={mobileStyles.inputGroup}>
                <label style={mobileStyles.label}>Time Out *</label>
                <div style={mobileStyles.timeInputGroup}>
                  <input
                    type="time"
                    value={currentEntry.timeOut}
                    onChange={(e) => {
                      const newTimeOut = e.target.value;
                      setCurrentEntry((prev) => {
                        const updated = { ...prev, timeOut: newTimeOut };
                        if (updated.timeIn) {
                          updated.totalHours = calculateHours(
                            updated.timeIn,
                            newTimeOut
                          );
                        }
                        return updated;
                      });
                    }}
                    style={{ ...mobileStyles.input, flex: 1 }}
                  />
                  <button
                    onClick={handleTimeOut}
                    disabled={!isTimedIn}
                    style={{
                      ...mobileStyles.button,
                      ...mobileStyles.nowButton,
                      ...(!isTimedIn
                        ? mobileStyles.buttonDisabled
                        : mobileStyles.buttonDanger),
                    }}
                  >
                    Now
                  </button>
                </div>
              </div>
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>
                Total Hours: {currentEntry.totalHours.toFixed(1)}
              </label>
              <div
                style={{
                  padding: "16px",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "8px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "24px",
                    fontWeight: "bold",
                    color: "#3b82f6",
                  }}
                >
                  {currentEntry.totalHours.toFixed(1)} hours
                </div>
              </div>
            </div>

            <div style={mobileStyles.inputGroup}>
              <label style={mobileStyles.label}>Notes (Optional)</label>
              <textarea
                value={currentEntry.notes}
                onChange={(e) =>
                  setCurrentEntry((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                placeholder="Additional notes about this activity..."
                style={mobileStyles.textarea}
              />
            </div>

            <button
              onClick={addTimeEntry}
              style={{
                ...mobileStyles.button,
                ...mobileStyles.buttonPrimary,
                width: "100%",
                marginTop: "8px",
              }}
            >
              <Plus size={20} />
              {editingEntry ? "Update Entry" : "Add Entry"}
            </button>
          </div>
        )}

        {/* Summary View */}
        {activeView === "summary" && (
          <div>
            <div style={mobileStyles.card}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h2 style={mobileStyles.cardTitle}>
                  <Calendar size={24} />
                  This Week
                </h2>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "bold",
                      color: "#3b82f6",
                    }}
                  >
                    {getCurrentWeekEntries()
                      .reduce((sum, entry) => sum + entry.totalHours, 0)
                      .toFixed(1)}
                  </div>
                  <div style={{ fontSize: "12px", color: "#6b7280" }}>
                    Total Hours
                  </div>
                </div>
              </div>

              <button
                onClick={generateEmailReport}
                disabled={getCurrentWeekEntries().length === 0}
                style={{
                  ...mobileStyles.button,
                  ...(getCurrentWeekEntries().length === 0
                    ? mobileStyles.buttonDisabled
                    : mobileStyles.buttonSuccess),
                  width: "100%",
                }}
              >
                <Send size={20} />
                Email Weekly Report
              </button>
            </div>

            <div style={mobileStyles.card}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  marginBottom: "16px",
                }}
              >
                Recent Entries
              </h3>

              {getCurrentWeekEntries().length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <Clock
                    size={48}
                    style={{ color: "#9ca3af", marginBottom: "16px" }}
                  />
                  <p style={{ color: "#6b7280", marginBottom: "8px" }}>
                    No time entries yet.
                  </p>
                  <p style={{ fontSize: "14px", color: "#6b7280" }}>
                    Tap the IN button to start tracking!
                  </p>
                </div>
              ) : (
                <div>
                  {getCurrentWeekEntries()
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .slice(0, 5) // Show only last 5 entries on mobile
                    .map((entry) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: "16px",
                          border: "2px solid #e5e7eb",
                          borderRadius: "8px",
                          marginBottom: "12px",
                          backgroundColor: "#fafafa",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            marginBottom: "8px",
                          }}
                        >
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontSize: "14px",
                                fontWeight: "bold",
                                color: "#1f2937",
                                marginBottom: "4px",
                              }}
                            >
                              {entry.activity}
                            </div>
                            <div style={{ fontSize: "12px", color: "#6b7280" }}>
                              {new Date(entry.date).toLocaleDateString()} •{" "}
                              {entry.timeIn} - {entry.timeOut}
                            </div>
                          </div>
                          <div
                            style={{
                              fontSize: "14px",
                              fontWeight: "bold",
                              color: "#3b82f6",
                            }}
                          >
                            {entry.totalHours.toFixed(1)}h
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() => editEntry(entry)}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #d1d5db",
                              background: "white",
                              color: "#6b7280",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Edit3 size={14} />
                            Edit
                          </button>
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            style={{
                              padding: "8px 12px",
                              border: "1px solid #fca5a5",
                              background: "#fef2f2",
                              color: "#dc2626",
                              borderRadius: "6px",
                              fontSize: "12px",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Floating Clock In/Out Button */}
      {activeView === "logger" && <QuickClockButton />}

      {/* Install Prompt */}
      {showInstallPrompt && (
        <div
          style={{
            position: "fixed",
            bottom: "90px",
            left: "16px",
            right: "16px",
            backgroundColor: "#1f2937",
            color: "white",
            padding: "16px",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
            zIndex: 1001,
          }}
        >
          <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
            Install this app for a better experience!
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setShowInstallPrompt(false)}
              style={{
                ...mobileStyles.button,
                backgroundColor: "#6b7280",
                color: "white",
                flex: 1,
              }}
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                // PWA install logic would go here
                setShowInstallPrompt(false);
              }}
              style={{
                ...mobileStyles.button,
                backgroundColor: "#3b82f6",
                color: "white",
                flex: 1,
              }}
            >
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InternTimeLogger;
