import type { ShareableState } from "./shareable-state";

export const MOCK_STATE: ShareableState = {
  courses: [
    {
      courseName: "ფინანსური აღრიცხვა",
      subjectCode: "ACC101",
      isActive: true,
      courseNameLocalized: { en: "Financial Accounting", ka: "ფინანსური აღრიცხვა" },
      groups: [
        {
          name: "Group A",
          lecturer: "დიანა ცოტაძე",
          lecturerLocalized: { en: "Diana Tsotadze", ka: "დიანა ცოტაძე" },
          times: [
            { day: 2, time: "10:00-11:30", room: "B201" },
            { day: 4, time: "10:00-11:30", room: "B201" },
          ],
        },
        {
          name: "Group B",
          lecturer: "დიანა ცოტაძე",
          lecturerLocalized: { en: "Diana Tsotadze", ka: "დიანა ცოტაძე" },
          times: [
            { day: 1, time: "14:00-15:30", room: "A105" },
            { day: 3, time: "14:00-15:30", room: "A105" },
          ],
        },
      ],
    },
    {
      courseName: "Web Development",
      subjectCode: "CS210",
      isActive: true,
      courseNameLocalized: { en: "Web Development", ka: "ვებ დეველოპმენტი" },
      groups: [
        {
          name: "Group 1",
          lecturer: "Giorgi Beridze",
          lecturerLocalized: { en: "Giorgi Beridze", ka: "გიორგი ბერიძე" },
          times: [
            { day: 1, time: "11:00-12:30", room: "Lab 2" },
            { day: 3, time: "11:00-12:30", room: "Lab 2" },
          ],
        },
        {
          name: "Group 2",
          lecturer: "Giorgi Beridze",
          lecturerLocalized: { en: "Giorgi Beridze", ka: "გიორგი ბერიძე" },
          times: [
            { day: 2, time: "16:00-17:30", room: "Lab 1" },
            { day: 4, time: "16:00-17:30", room: "Lab 1" },
          ],
        },
      ],
    },
    {
      courseName: "Algorithms",
      subjectCode: "CS301",
      isActive: true,
      courseNameLocalized: { en: "Algorithms", ka: "ალგორითმები" },
      groups: [
        {
          name: "Morning",
          lecturer: "მარიამ ჯაფარიძე",
          lecturerLocalized: { en: "Mariam Japaridze", ka: "მარიამ ჯაფარიძე" },
          times: [
            { day: 2, time: "09:00-10:30", room: "B305" },
            { day: 5, time: "09:00-10:30", room: "B305" },
          ],
        },
        {
          name: "Evening",
          lecturer: "მარიამ ჯაფარიძე",
          lecturerLocalized: { en: "Mariam Japaridze", ka: "მარიამ ჯაფარიძე" },
          times: [
            { day: 4, time: "18:00-19:30", room: "B305" },
            { day: 6, time: "12:00-13:30", room: "B305" },
          ],
        },
      ],
    },
    {
      courseName: "Introduction to Advanced Machine Learning and Artificial Intelligence Perspectives with Extra Long Title For Testing Constraints",
      subjectCode: "AI502",
      isActive: true,
      courseNameLocalized: { en: "Introduction to Advanced Machine Learning and Artificial Intelligence Perspectives with Extra Long Title For Testing Constraints", ka: "შესავალი გაფართოებული მანქანური დასწავლისა და ხელოვნური ინტელექტის პერსპექტივებში ექსტრა გრძელი სათაურით შეზღუდვების შესამოწმებლად" },
      groups: [
        {
          name: "Group Alpha Beta Gamma Delta Long Name",
          lecturer: "Dr. Alexander Vashakidze The Third Professional Long Name Placeholder",
          lecturerLocalized: { en: "Dr. Alexander Vashakidze The Third Professional Long Name Placeholder", ka: "დოქტორ ალექსანდრე ვაშაკიძე მესამე პროფესიონალური გრძელი სახელის ფლეისჰოლდერი" },
          times: [
            { day: 1, time: "10:00-13:00", room: "Conference Hall 1A Big Auditorium" },
          ],
        },
        {
          name: "Group 2",
          lecturer: "Guest Lecturer 1",
          lecturerLocalized: { en: "Guest Lecturer 1", ka: "მოწვეული ლექტორი 1" },
          times: [
            { day: 3, time: "09:00-12:00", room: "Online Zoom link" },
          ],
        },
      ],
    },
    {
      courseName: "Database Systems",
      subjectCode: "IT201",
      isActive: false,
      courseNameLocalized: { en: "Database Systems", ka: "მონაცემთა ბიზები" },
      groups: [
        {
          name: "G1",
          lecturer: "T. Chikovani",
          lecturerLocalized: { en: "T. Chikovani", ka: "თ. ჩიქოვანი" },
          times: [
            { day: 5, time: "15:00-17:00", room: "Lab 5" }
          ]
        }
      ]
    }
  ],
  daySettings: {
    1: { pref: "enabled", min: 540, max: 1200 },
    2: { pref: "enabled", min: 540, max: 1200 },
    3: { pref: "enabled", min: 540, max: 1200, busyPeriods: [{ start: 720, end: 780 }] },
    4: { pref: "enabled", min: 540, max: 1200 },
    5: { pref: "prioritize", min: 540, max: 1200 },
    6: { pref: "enabled", min: 600, max: 1200 },
    7: { pref: "disabled", min: 540, max: 1200 },
  },
  globalTime: { min: 540, max: 1200 },
  classesPerDay: { min: 1, max: 4 },
  maxOverlap: 0,
  dailyCommute: { min: 1, max: 2 },
  lecturerPrefs: [{ lecturer: "დიანა ცოტაძე", weight: "prefer" }],
};
