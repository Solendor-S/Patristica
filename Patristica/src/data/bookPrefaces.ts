export interface BookPreface {
  summary: string
  themes: string[]
  author: string
  dating: string
  evidence?: string[]
  sources: string[]
}

const PREFACES: Record<string, BookPreface> = {
  Genesis: {
    summary: "Genesis narrates the creation of the world, the fall of humanity, the flood, and the founding of the Hebrew people through Abraham, Isaac, Jacob, and Joseph. It establishes the foundational covenant between God and his people and the origin of sin, death, and the promise of redemption.",
    themes: ["Creation and the nature of God", "The fall and human sinfulness", "Covenant — God's binding commitment to his people", "Providence and redemptive history", "The seed promise (3:15) pointing forward to Christ"],
    author: "Moses, by consistent Jewish and Christian tradition. The book itself is anonymous, but Mosaic authorship is affirmed by the rest of the Pentateuch, the Prophets, and Jesus himself (Mark 12:26; John 5:46–47).",
    dating: "Composed during Moses' lifetime, c. 1446–1406 BC (early Exodus date) or c. 1290–1250 BC (late date). The narratives reflect second-millennium BC customs closely matching extra-biblical records.",
    evidence: [
      "The patriarchal customs (levirate marriage, adoption, bride-price, treaty forms) match 2nd-millennium BC texts from Nuzi and Mari, not later periods.",
      "Josephus (Antiquities 1.1–6) treats Genesis as genuine Mosaic history.",
      "Jesus attributes Pentateuchal authorship to Moses (John 5:46; Luke 24:27).",
      "The structure of the Sinaitic covenant (Exodus–Deuteronomy) matches 2nd-millennium Hittite suzerainty treaty forms, placing Mosaic composition firmly in that era."
    ],
    sources: ["Josephus, Antiquities 1", "Nuzi Tablets (2nd millennium BC parallels)", "Mari Texts", "Hittite Suzerainty Treaties"]
  },

  Exodus: {
    summary: "Exodus records God's deliverance of Israel from slavery in Egypt through Moses, the giving of the Law at Sinai, and the construction of the Tabernacle. It is the central redemptive event of the Old Testament, prefiguring Christ's redemption.",
    themes: ["Redemption and deliverance", "The holiness and power of God", "The Law as covenant obligation", "Worship — the Tabernacle as God's dwelling", "The mediator (Moses as type of Christ)"],
    author: "Moses. Internal references (17:14; 24:4; 34:27) explicitly state Moses wrote portions. The broader Pentateuchal tradition and NT confirm Mosaic authorship.",
    dating: "Events: c. 1446 BC (early date) or c. 1290–1260 BC (late date). Written during the wilderness period.",
    sources: ["Josephus, Antiquities 2–3", "Egyptian records of the Hyksos period", "Eusebius, Preparation for the Gospel 9"]
  },

  Leviticus: {
    summary: "Leviticus is the handbook of Israel's priesthood and worship, detailing sacrifices, purity laws, and the Day of Atonement. Every regulation points to the holiness of God and the need for atonement — all fulfilled in Christ's perfect sacrifice.",
    themes: ["Holiness: 'Be holy as I am holy'", "Atonement through blood sacrifice", "Clean and unclean — approaching a holy God", "The Day of Atonement (Yom Kippur)", "Jubilee and redemption"],
    author: "Moses. The book repeatedly claims divine origin ('The LORD spoke to Moses', occurring over 30 times).",
    dating: "c. 1446–1406 BC, composed at Sinai and in the wilderness.",
    sources: ["Josephus, Antiquities 3.8–10", "Hebrews 9–10 (NT commentary on Levitical system)"]
  },

  Numbers: {
    summary: "Numbers records Israel's forty years of wilderness wandering, punctuated by rebellion, judgment, and renewal. It traces two generations — the faithless exodus generation who died in the wilderness and the new generation who would enter Canaan.",
    themes: ["Faith versus unbelief", "God's faithfulness despite human failure", "Leadership and its cost", "The journey toward the promised inheritance", "Balaam's oracles foretelling a coming King (24:17)"],
    author: "Moses. The book claims Mosaic composition for key sections (33:2) and is cited as Mosaic in the NT (John 3:14; 1 Cor. 10:1–11).",
    dating: "c. 1446–1406 BC (early date), covering the 40-year wilderness period.",
    sources: ["Josephus, Antiquities 3.11–4.8", "Paul's use in 1 Corinthians 10"]
  },

  Deuteronomy: {
    summary: "Deuteronomy ('second law') consists of Moses' farewell speeches to Israel on the plains of Moab, recapping the Law, rehearsing the covenant, and calling Israel to undivided loyalty to God. It closes with Moses' death and the transfer of leadership to Joshua.",
    themes: ["Covenant loyalty and love for God", "Remember and do not forget", "The promise of a future Prophet like Moses (18:15–18) — fulfilled in Christ", "Blessings and curses", "Succession and continuity of covenant leadership"],
    author: "Moses (with the account of his death likely added by Joshua or Ezra). Deuteronomy 31:9 states Moses 'wrote this law'. Jesus quotes Deuteronomy more than any other book.",
    dating: "c. 1406 BC, the final weeks of Moses' life in Moab.",
    sources: ["Josephus, Antiquities 4.8", "Hittite Suzerainty Treaties (structural parallels)", "Dead Sea Scrolls: Deuteronomy scrolls found at Qumran"]
  },

  Joshua: {
    summary: "Joshua narrates the conquest and division of Canaan under Joshua's leadership following Moses' death. It demonstrates God's faithfulness to the Abrahamic and Mosaic covenant promises as Israel takes possession of the land.",
    themes: ["Faithfulness to God's promises", "Holy war and the judgment of Canaan", "Covenant renewal", "Rest as foretaste of eternal Sabbath (Heb. 4)", "Rahab the Gentile — faith apart from ethnicity"],
    author: "Largely Joshua himself, with later editorial additions (e.g., the account of his death in ch. 24). The Talmud (Bava Batra 14b) attributes it to Joshua.",
    dating: "Events: c. 1406–1380 BC. Composition likely during Joshua's lifetime or shortly after.",
    sources: ["Josephus, Antiquities 5.1", "Amarna Letters (14th century BC — political instability in Canaan consistent with conquest period)"]
  },

  Judges: {
    summary: "Judges covers the turbulent period between Joshua's death and the monarchy, characterized by a recurring cycle of apostasy, oppression, repentance, and deliverance through charismatic leaders called judges. It honestly portrays Israel's spiritual decline.",
    themes: ["The cycle of sin, judgment, and deliverance", "The need for a righteous king", "Idolatry and its consequences", "God's grace despite human failure", "The downward spiral of a nation without God"],
    author: "Unknown. Jewish tradition attributes it to Samuel (Bava Batra 14b).",
    dating: "Events: c. 1380–1050 BC. Composition likely in the early monarchy period.",
    sources: ["Josephus, Antiquities 5.2–8"]
  },

  Ruth: {
    summary: "Ruth is a short narrative of extraordinary faithfulness set during the period of the Judges. The Moabite widow Ruth's loyalty to Naomi and her marriage to Boaz the kinsman-redeemer provides a beautiful portrait of covenant love (hesed) and points to David's lineage.",
    themes: ["Loyal covenant love (hesed)", "Redemption through the kinsman-redeemer (type of Christ)", "Providence in ordinary life", "Gentile inclusion in the covenant people", "The line of David"],
    author: "Unknown. Jewish tradition attributes it to Samuel.",
    dating: "Events: c. 1100 BC. Composition likely early monarchy period.",
    sources: ["Josephus, Antiquities 5.9"]
  },

  '1 Samuel': {
    summary: "1 Samuel spans the transition from judges to monarchy: the call of Samuel, the rise and fall of Saul, and the anointing and early career of David. It explores what genuine leadership before God looks like and the danger of demanding a king like other nations.",
    themes: ["True versus false leadership", "The heart God looks for", "Prophecy and its fulfillment", "The rise of the Davidic line", "God's sovereignty over human kingdoms"],
    author: "Unknown. Likely compiled from records of Samuel, Nathan, and Gad (cf. 1 Chr. 29:29).",
    dating: "Events: c. 1100–1010 BC. Composition likely early in the monarchy.",
    sources: ["Josephus, Antiquities 6", "1 Chronicles 29:29 (sources cited)"]
  },

  '2 Samuel': {
    summary: "2 Samuel covers David's reign — his early successes, the Davidic covenant (ch. 7), his catastrophic sin with Bathsheba, and its consequences through rebellion and family tragedy. It presents David as both the greatest king and a sinner in need of grace.",
    themes: ["The Davidic covenant and the eternal throne", "Sin and its consequences even for the forgiven", "Sovereignty, grace, and justice", "True repentance (Psalm 51 background)", "The nature of kingship"],
    author: "Unknown. Compiled from multiple prophetic sources.",
    dating: "Events: c. 1010–970 BC.",
    sources: ["Josephus, Antiquities 7", "Psalm 51 (David's repentance after Nathan's confrontation)"]
  },

  '1 Kings': {
    summary: "1 Kings opens with Solomon's golden reign, the building of the Temple, and the glory of Israel — then chronicles the kingdom's division following Solomon's apostasy. It introduces Elijah as prophet, confronting Ahab and Jezebel's Baalism in northern Israel.",
    themes: ["Wisdom and its limits", "The Temple as God's dwelling", "Covenant faithfulness versus apostasy", "The prophetic word as history's compass", "The folly of syncretism"],
    author: "Unknown. Jewish tradition assigns it to Jeremiah. Compiled from royal annals and prophetic records.",
    dating: "Events: c. 970–850 BC. Final compilation likely during or after the exile.",
    sources: ["Josephus, Antiquities 8", "Royal annals cited internally (11:41; 14:19, 29)"]
  },

  '2 Kings': {
    summary: "2 Kings continues from Elijah to the fall of both kingdoms — Israel to Assyria (722 BC) and Judah to Babylon (586 BC). Elisha's ministry, the reforms of Hezekiah and Josiah, and the tragedy of exile are narrated as covenant consequences.",
    themes: ["Covenant faithfulness and its consequences", "The prophetic word fulfilled", "Reform and relapse", "Sovereignty over empires", "Hope beyond judgment — the Davidic line preserved"],
    author: "Unknown. Same author/school as 1 Kings. Possibly compiled by Jeremiah or a Deuteronomistic school.",
    dating: "Events: c. 853–561 BC. Composition during or after the exile.",
    sources: ["Josephus, Antiquities 9–10", "Assyrian annals (Sennacherib's Prism confirming his siege of Jerusalem)"]
  },

  '1 Chronicles': {
    summary: "1 Chronicles retells Israel's history from Adam to David, focusing especially on David's preparation for the Temple. Written for the post-exilic community, it emphasizes Davidic covenant promises and proper worship as the foundation for national restoration.",
    themes: ["The Davidic covenant as foundation of hope", "True worship and the Temple", "All Israel as covenant community", "Genealogy and continuity of God's purposes", "God's sovereignty through history"],
    author: "Jewish tradition (Bava Batra 15a) attributes it to Ezra. The book shares vocabulary and concerns with Ezra-Nehemiah.",
    dating: "c. 450–400 BC, the early post-exilic period.",
    sources: ["Josephus, Antiquities 7", "Ezra-Nehemiah (shared authorship tradition)"]
  },

  '2 Chronicles': {
    summary: "2 Chronicles covers Solomon's reign and the history of Judah's kings to the exile, closing uniquely with Cyrus's decree permitting return. It emphasizes Temple worship, prophetic warning, and the possibility of repentance even in judgment.",
    themes: ["Temple and worship as covenant center", "Repentance and restoration", "Prophetic accountability", "The Davidic line's preservation", "God's long-suffering toward his people"],
    author: "Same as 1 Chronicles — likely Ezra or his school.",
    dating: "c. 450–400 BC.",
    sources: ["Josephus, Antiquities 8–11", "Cyrus Cylinder (confirming Cyrus's policy of restoring captive peoples)"]
  },

  Ezra: {
    summary: "Ezra records two phases of return from Babylonian exile: the first wave under Zerubbabel rebuilding the Temple (chs. 1–6), and Ezra's own return to restore the Law and address mixed marriages (chs. 7–10). It shows God's faithfulness in fulfilling Jeremiah's 70-year prophecy.",
    themes: ["Fulfillment of prophetic promise", "Covenant renewal and the Law", "Purity of the covenant community", "God's sovereignty over Persian kings", "Scripture as the foundation of reform"],
    author: "Ezra the scribe, with possible editorial additions. First-person sections (7:27–9:15) confirm his direct authorship.",
    dating: "Events: 538–458 BC. Composition: c. 440–430 BC.",
    sources: ["Josephus, Antiquities 11.1–5", "Cyrus Cylinder", "Artaxerxes correspondence preserved in the text"]
  },

  Nehemiah: {
    summary: "Nehemiah records the rebuilding of Jerusalem's walls under Nehemiah's leadership (c. 445 BC) and the subsequent covenant renewal under Ezra. It combines administrative memoir with spiritual reformation, showing that physical and spiritual rebuilding go together.",
    themes: ["Prayer as the foundation of action", "Leadership under opposition", "Covenant renewal and the Sabbath", "Social justice — care for the poor", "God's faithfulness to his city"],
    author: "Largely Nehemiah himself (the 'Nehemiah Memoir' in 1:1–7:73; 12:27–13:31), with Ezra as possible final compiler.",
    dating: "Events: 445–432 BC. Composition: c. 430 BC.",
    sources: ["Josephus, Antiquities 11.5–6", "Persian administrative texts confirming governors of Judah in this period"]
  },

  Esther: {
    summary: "Esther narrates the salvation of the Jewish people in Persia through Queen Esther and her cousin Mordecai under the threat of Haman's genocide. God's name is never mentioned — yet his providence is unmistakable throughout the narrative.",
    themes: ["Providence without explicit miracle", "Courage in the face of death — 'for such a time as this'", "The reversal of evil", "Jewish identity and survival", "The feast of Purim"],
    author: "Unknown. Possibly Mordecai (9:20) or a Persian Jew with access to royal records.",
    dating: "Events: c. 483–473 BC under Xerxes I (Ahasuerus). Composition: c. 460–400 BC.",
    sources: ["Josephus, Antiquities 11.6", "Herodotus, Histories (confirming Xerxes' Persian court customs)"]
  },

  Job: {
    summary: "Job is a profound exploration of innocent suffering, God's sovereignty, and the inadequacy of simplistic retribution theology. Job's sufferings, his debates with three friends, Elihu's intervention, and God's answer from the whirlwind form one of Scripture's greatest theological and literary works.",
    themes: ["The problem of innocent suffering", "God's sovereignty beyond human comprehension", "True versus false theology", "Faith that persists without explanation", "The Redeemer who lives (19:25) — anticipating resurrection and Christ"],
    author: "Unknown. Jewish tradition (Bava Batra 14b–15a) suggests Moses. The antiquity of the cultural setting (patriarchal period) suggests early composition.",
    dating: "The setting appears patriarchal (c. 2000–1700 BC). Composition uncertain — anywhere from patriarchal times to the early monarchy.",
    sources: ["Josephus (does not treat Job extensively)", "Ancient Near Eastern wisdom literature (parallel: Babylonian 'Dialogue of a Man with His God')"]
  },

  Psalms: {
    summary: "The Psalms are Israel's divinely inspired hymnbook and prayer book — 150 poems covering the full range of human experience before God: praise, lament, confession, thanksgiving, wisdom, and royal expectation. They are the most quoted OT book in the NT.",
    themes: ["Praise and worship", "Lament and honest prayer", "The Messiah — royal, priestly, and suffering Servant", "Torah meditation and wisdom", "God's kingship over all creation"],
    author: "Multiple authors: David (73 psalms attributed), Asaph, the Sons of Korah, Solomon, Moses, Heman, Ethan, and anonymous. The Davidic attribution is affirmed by NT citations (e.g., Acts 4:25; Heb. 4:7).",
    dating: "Spans over 1,000 years of composition — from Moses (Ps. 90) to the post-exilic period. Final compilation likely c. 450–400 BC.",
    sources: ["Dead Sea Scrolls: The Great Psalms Scroll (11QPsa) — 41 Psalms found at Qumran", "Josephus, Antiquities 7.12 (on David's psalms)"]
  },

  Proverbs: {
    summary: "Proverbs is a collection of wisdom sayings for living skillfully in God's world. It presents two ways — wisdom and folly — and calls the reader to pursue wisdom, which begins with the fear of the LORD. The personification of Wisdom in chapters 8–9 anticipates Christ as the eternal Word.",
    themes: ["The fear of the LORD as the beginning of wisdom", "Wisdom versus folly in practical life", "Speech, work, and relationships", "Personified Wisdom — Wisdom as divine co-creator (8:22–31)", "The ideal wife/Wisdom incarnate (ch. 31)"],
    author: "Primarily Solomon (1:1; 10:1; 25:1), with contributions from Agur (ch. 30) and Lemuel (ch. 31). Hezekiah's men compiled additional Solomonic proverbs (25:1).",
    dating: "Solomonic proverbs: c. 970–930 BC. Final compilation under Hezekiah: c. 715–686 BC.",
    sources: ["Josephus, Antiquities 8.2 (on Solomon's wisdom)", "Egyptian wisdom literature parallels (Instruction of Amenemope — similarities with Prov. 22–24)"]
  },

  Ecclesiastes: {
    summary: "Ecclesiastes ('the Preacher') explores life 'under the sun' apart from God and finds it meaningless — yet concludes with the call to fear God and keep his commandments. It is wisdom's honest reckoning with mortality, futility, and the limits of human achievement.",
    themes: ["Vanity and the limits of earthly wisdom", "The gift of the present moment", "Death as the great equalizer", "Fear God — the conclusion of the whole matter", "Joy as God's gift in a fallen world"],
    author: "Traditionally Solomon ('son of David, king in Jerusalem', 1:1). Most conservative scholars accept Solomonic authorship; some see a later author adopting Solomon's persona as a literary device.",
    dating: "If Solomonic: c. 940–930 BC. If later pseudonymous: c. 450–200 BC.",
    sources: ["Josephus, Antiquities 8.2"]
  },

  'Song of Solomon': {
    summary: "The Song of Solomon is a collection of love poems celebrating the beauty of marital love between a man and a woman. Jewish and Christian tradition have read it allegorically as depicting God's love for Israel or Christ's love for the Church — both readings can be held together.",
    themes: ["The goodness of physical love within marriage", "Longing and desire as reflections of divine love", "Beauty and the beloved", "Covenant intimacy", "Christ and the Church (Eph. 5:25–32 background)"],
    author: "Solomon (1:1), affirmed by Jewish tradition. The book's setting and literary style are consistent with a 10th-century BC royal court.",
    dating: "c. 970–930 BC.",
    sources: ["Josephus, Antiquities 8.2", "Ancient Near Eastern love poetry parallels (Egyptian New Kingdom love poems)"]
  },

  Isaiah: {
    summary: "Isaiah is the greatest of the writing prophets — called the 'fifth evangelist' by the early church. He prophesies judgment on Israel, Judah, and the nations, but also magnificent hope: the Servant Songs, the virgin birth, the suffering Servant of chapter 53, and the new creation all find their fulfillment in Jesus Christ.",
    themes: ["The holiness and sovereignty of God", "Judgment and salvation as two sides of one coin", "The Servant of the LORD — suffering, death, and vindication", "The new Exodus and the new creation", "The nations coming to Zion"],
    author: "Isaiah son of Amoz (1:1), active c. 740–700 BC. The unity of Isaiah has been challenged since the 18th century (chs. 40–66 attributed to a 'Second Isaiah'). Evidence strongly supports a single author.",
    dating: "c. 740–700 BC under Uzziah, Jotham, Ahaz, and Hezekiah.",
    evidence: [
      "The Great Isaiah Scroll (1QIsa-a) found at Qumran (c. 100 BC) is a single, seamless manuscript with no scribal break at chapter 40, strongly suggesting scribal tradition knew only one author.",
      "Jesus and the NT consistently cite 'Isaiah' without distinction, treating chapters 1–66 as one book (e.g., John 12:38–41 quotes both halves in one breath, attributing both to 'Isaiah').",
      "Specific predictive prophecy of Cyrus by name (44:28; 45:1) is the strongest argument against unity — yet this is precisely the kind of predictive prophecy that demonstrates divine inspiration.",
      "Vocabulary and theological themes are interwoven throughout both halves: 'the Holy One of Israel' appears 25 times, distributed across both sections.",
      "Josephus (Antiquities 11.1.2) records that Cyrus read Isaiah's prophecy about himself and was moved to permit the Jews to return — treating it as genuinely predictive.",
      "The Dead Sea Scrolls include fragments of both sections of Isaiah, confirming its acceptance as a unified book in the 2nd century BC."
    ],
    sources: ["Dead Sea Scrolls: Great Isaiah Scroll (1QIsa-a)", "Josephus, Antiquities 11.1.2", "John 12:38–41 (NT unity citation)", "Justin Martyr, Dialogue with Trypho"]
  },

  Jeremiah: {
    summary: "Jeremiah ministered for 40 years to a Jerusalem hurtling toward destruction, calling the people to repentance while prophesying inevitable judgment. His 'New Covenant' prophecy (31:31–34) is the most significant covenant promise in the OT, directly quoted in Hebrews 8.",
    themes: ["The new covenant written on the heart", "Faithfulness under persecution", "True versus false prophecy", "The personal cost of prophetic ministry", "Judgment and hope for restoration"],
    author: "Jeremiah son of Hilkiah, with his scribe Baruch (36:4–32) writing and preserving his oracles.",
    dating: "Active c. 627–582 BC, from Josiah's reign to after the fall of Jerusalem.",
    sources: ["Josephus, Antiquities 10.5–9", "Babylonian Chronicles (confirming Nebuchadnezzar's campaigns)", "Lachish Letters (ostraca from c. 589 BC, contemporary with Jeremiah)"]
  },

  Lamentations: {
    summary: "Lamentations is a collection of five acrostic poems mourning the destruction of Jerusalem in 586 BC. Written in anguish and grief, it nevertheless contains one of Scripture's most luminous affirmations of hope: 'The steadfast love of the LORD never ceases' (3:22–23).",
    themes: ["Honest grief and lament before God", "Confession of national sin", "The steadfast love of God in the midst of judgment", "Desolation and hope", "Waiting on God's restoration"],
    author: "Jeremiah by strong Jewish and early Christian tradition (Jerome, Origen), though the book is anonymous. The eyewitness detail and emotional depth are consistent with Jeremiah.",
    dating: "Shortly after Jerusalem's fall, c. 586–580 BC.",
    sources: ["Josephus, Antiquities 10.8", "Babylonian records of Jerusalem's destruction"]
  },

  Ezekiel: {
    summary: "Ezekiel was a priest-prophet among the first wave of Jewish exiles in Babylon. His extraordinary visions — the living creatures and the divine chariot (chs. 1–3), the departure of God's glory from the Temple (chs. 8–11), and the valley of dry bones (ch. 37) — all point toward judgment and ultimate restoration.",
    themes: ["The glory of God — his departure and return", "Individual accountability before God", "The new Temple and new worship", "Resurrection and national restoration", "The Good Shepherd (ch. 34)"],
    author: "Ezekiel son of Buzi, a priest (1:3). The book is strongly first-person throughout and displays remarkable internal consistency.",
    dating: "Active 593–571 BC in Babylon. The precisely dated oracles confirm contemporaneous composition.",
    sources: ["Josephus, Antiquities 10.5", "Babylonian Temple texts (parallels with Ezekiel's priestly concerns)"]
  },

  Daniel: {
    summary: "Daniel combines court narratives of Jewish faithfulness in Babylon (chs. 1–6) with apocalyptic visions of world empires and the final kingdom of God (chs. 7–12). Its prophecies of four world empires, the 70 weeks, and the Son of Man are among Scripture's most detailed and fulfilled predictions.",
    themes: ["God's sovereignty over world empires", "Faithfulness under persecution", "The Son of Man and his eternal kingdom", "The resurrection of the dead (12:2)", "Fulfilled prophecy as evidence of divine inspiration"],
    author: "Daniel himself (the book is written in first person from ch. 7 onward; Jesus calls him 'Daniel the prophet', Matt. 24:15). Disputed by critical scholars who argue for a Maccabean date (c. 167–164 BC).",
    dating: "Traditional: composed during Daniel's lifetime in Babylon, c. 605–535 BC. Critical consensus: composed c. 167–164 BC as Maccabean propaganda (ex eventu 'prophecy').",
    evidence: [
      "Jesus cites 'Daniel the prophet' (Matt. 24:15; Mark 13:14), treating Daniel as a genuine 6th-century prophet — not a Maccabean fiction. The Lord's testimony is decisive.",
      "Dead Sea Scrolls: Eight Daniel manuscripts were found at Qumran (including 4QDan-a), copied c. 125 BC. This is barely 40 years after the supposed Maccabean composition date — too short for a disputed text to achieve wide canonical acceptance and multiple manuscript copies.",
      "The book's Aramaic is 'Imperial Aramaic' of the 6th–4th centuries BC, not the later Aramaic of the Maccabean period. The linguistic evidence supports an early date (K.A. Kitchen, R.D. Wilson).",
      "Josephus (Antiquities 11.8.5) records that Alexander the Great was shown the book of Daniel (which predicted the fall of Persia), and this caused him to honor the Jews — treating it as a recognized book by the 4th century BC, before any Maccabean date is possible.",
      "The Septuagint (LXX) translation of Daniel dates to c. 100–150 BC, implying the book was in recognized circulation well before a Maccabean origin could gain canonical standing.",
      "The four-empire scheme (Babylonian, Medo-Persian, Greek, Roman) fits a 6th-century perspective naturally. A Maccabean author would likely have made Antiochus IV Epiphanes the ultimate villain, but Daniel's visions point beyond him to a greater eschatological enemy.",
      "The detailed accuracy of chapters 10–11 about Hellenistic history is cited by critics as evidence of Maccabean composition — but this 'argument from accuracy' simply demonstrates genuine predictive prophecy to the traditional reader."
    ],
    sources: ["Dead Sea Scrolls: 4QDan-a through 4QDan-h (8 Daniel manuscripts at Qumran)", "Josephus, Antiquities 11.8.5 (Alexander and Daniel)", "Jesus in Matthew 24:15; Mark 13:14", "Septuagint Daniel (pre-Maccabean circulation)"]
  },

  Hosea: {
    summary: "Hosea uses his own tragic marriage to an unfaithful wife as a living parable of God's covenant with Israel. Despite Israel's spiritual adultery, God pursues her with persistent love — a love that foreshadows the New Covenant.",
    themes: ["Covenant love (hesed) and faithfulness", "Spiritual adultery and its consequences", "God's persistent pursuit of the wayward", "Repentance and restoration", "The New Covenant ('I will betroth you to me forever', 2:19)"],
    author: "Hosea son of Beeri (1:1), active c. 755–715 BC in the northern kingdom.",
    dating: "c. 755–715 BC, the final decades of the northern kingdom before its fall to Assyria in 722 BC.",
    sources: ["Josephus, Antiquities 9 (background of the period)", "Assyrian annals confirming the fall of Samaria under Sargon II (722 BC)"]
  },

  Joel: {
    summary: "Joel uses a devastating locust plague as a sign of the coming 'Day of the LORD' — a day of judgment and purification. His prophecy of the outpouring of the Spirit on all flesh (2:28–32) was directly fulfilled at Pentecost (Acts 2:16–21).",
    themes: ["The Day of the LORD — judgment and restoration", "Repentance and its urgency", "The outpouring of the Spirit", "The nations judged and Israel restored", "The valley of decision"],
    author: "Joel son of Pethuel (1:1). No historical background is given, making dating difficult.",
    dating: "Disputed: some place it in the pre-exilic period (9th century BC), others post-exilic (5th–4th century BC). The early dating is supported by its canonical position among the 8th-century prophets.",
    sources: ["Acts 2:16–21 (Peter's Pentecost sermon)", "Josephus (limited direct reference)"]
  },

  Amos: {
    summary: "Amos was a shepherd from Judah sent to preach judgment to the prosperous northern kingdom of Israel. His thundering denunciations of social injustice, religious hypocrisy, and covenant unfaithfulness make him the first 'classical' prophet.",
    themes: ["Social justice as covenant obligation", "Religious ritual without righteousness is detestable", "Judgment begins with the people of God", "The plumb line of God's righteousness", "Restoration of the Davidic line (9:11–12, cited in Acts 15)"],
    author: "Amos of Tekoa (1:1), active c. 760–750 BC.",
    dating: "c. 760–750 BC, during the reign of Jeroboam II.",
    sources: ["Josephus, Antiquities 9.10", "Assyrian records of Tiglath-Pileser III (confirming Amos's historical setting)"]
  },

  Obadiah: {
    summary: "Obadiah is the shortest OT book — a single 21-verse oracle against Edom for its treachery when Jerusalem fell. It affirms that those who harm God's people will face judgment, and that Zion will ultimately be restored.",
    themes: ["Divine justice against those who harm God's people", "Pride precedes destruction", "The covenant bond between God and Israel", "Restoration of Zion"],
    author: "Obadiah (1:1). Nothing else is known about him.",
    dating: "Likely after 586 BC (Edom's role in Jerusalem's fall; cf. Ps. 137:7; Lam. 4:21–22), placing it c. 585–550 BC.",
    sources: ["Josephus, Antiquities (background of Edom)", "Psalm 137 (Edom's treachery)"]
  },

  Jonah: {
    summary: "Jonah is a narrative about a prophet who flees from God's call to preach to Nineveh, is swallowed by a great fish, repents, and ultimately sees Nineveh repent — yet struggles with God's mercy toward enemies. Jesus cites the 'sign of Jonah' as a type of his own death and resurrection.",
    themes: ["The universal scope of God's mercy", "Mission to the nations", "The sign of Jonah — three days, death and resurrection (Matt. 12:40)", "Human resistance to God's purposes", "God's sovereignty over creation and nations"],
    author: "Jonah son of Amittai (1:1), active c. 793–753 BC (cf. 2 Kings 14:25).",
    dating: "c. 793–753 BC during the reign of Jeroboam II.",
    evidence: [
      "Jesus treats Jonah as a historical figure, not a parable: 'As Jonah was three days and three nights in the belly of the great fish, so will the Son of Man be three days and three nights in the heart of the earth' (Matt. 12:40).",
      "2 Kings 14:25 names Jonah son of Amittai as a historical prophet under Jeroboam II, anchoring him in real history.",
      "Josephus (Antiquities 9.10.2) records Jonah's prophecy about Jeroboam II as historical fact."
    ],
    sources: ["Josephus, Antiquities 9.10.2", "Matthew 12:39–41; Luke 11:29–32 (Jesus's historical citation)"]
  },

  Micah: {
    summary: "Micah was a contemporary of Isaiah, prophesying judgment against both Samaria and Jerusalem. His famous summary of true religion — 'do justice, love kindness, and walk humbly with your God' (6:8) — and his prophecy of Messiah's birth in Bethlehem (5:2) make him one of the most significant minor prophets.",
    themes: ["Social justice and true religion", "Judgment on corrupt leadership", "The birth of the Messiah in Bethlehem (5:2)", "The remnant and restoration of Zion", "God's character — justice and steadfast love"],
    author: "Micah of Moresheth (1:1), active c. 737–696 BC.",
    dating: "c. 737–696 BC under Jotham, Ahaz, and Hezekiah.",
    sources: ["Josephus, Antiquities 9–10 (background)", "Matthew 2:6 (Bethlehem prophecy fulfilled)", "Jeremiah 26:18 (Micah quoted in Jeremiah's trial)"]
  },

  Nahum: {
    summary: "Nahum prophesies the fall of Nineveh — the cruel Assyrian capital — as God's just judgment. Written a century after Jonah's mission, it shows that Nineveh's repentance did not last. The book affirms God's justice against oppressive empires.",
    themes: ["The justice of God against oppression", "God's jealousy for his people", "The fall of Assyrian power", "No one can withstand God's judgment", "Comfort for the oppressed"],
    author: "Nahum the Elkoshite (1:1). His location is unknown.",
    dating: "Between 663 BC (the fall of Thebes, mentioned in 3:8) and 612 BC (the fall of Nineveh). Likely c. 650–620 BC.",
    evidence: [
      "Nineveh fell in 612 BC to a coalition of Babylonians and Medes — exactly as Nahum predicted. Ancient records (Babylonian Chronicle) confirm the city's dramatic destruction.",
      "The vivid detail of Nahum's battle scenes (3:1–3) suggests either prophetic vision or very close proximity to the events."
    ],
    sources: ["Babylonian Chronicle (confirming Nineveh's fall in 612 BC)", "Josephus, Antiquities 9 (Assyrian background)"]
  },

  Habakkuk: {
    summary: "Habakkuk is unique among the prophets — he argues with God. He questions why God allows injustice in Judah, then why God would use wicked Babylon as his instrument of judgment. God's answer — 'the righteous shall live by his faith' (2:4) — became foundational for Paul's theology in Romans and Galatians.",
    themes: ["Wrestling honestly with God in prayer", "The righteous shall live by faith (2:4)", "God's sovereignty over history and evil", "The ultimate triumph of God's glory", "The prayer of trembling trust (ch. 3)"],
    author: "Habakkuk the prophet (1:1). Nothing more is known of him.",
    dating: "c. 612–605 BC, between the fall of Nineveh and Nebuchadnezzar's rise.",
    sources: ["Dead Sea Scrolls: 1QpHab (Habakkuk Commentary, the oldest surviving biblical commentary)", "Romans 1:17; Galatians 3:11; Hebrews 10:38 (Hab. 2:4 cited three times in NT)"]
  },

  Zephaniah: {
    summary: "Zephaniah prophesied during Josiah's reforms, warning of the coming Day of the LORD in fierce terms before concluding with the joyful promise of restoration and the LORD himself dwelling among his redeemed people.",
    themes: ["The Day of the LORD as cosmic judgment", "Seeking God in humility", "Judgment on pride and complacency", "The remnant — humble and trusting", "The LORD rejoicing over his people with singing (3:17)"],
    author: "Zephaniah son of Cushi (1:1), active c. 640–610 BC.",
    dating: "c. 640–630 BC, early in Josiah's reign.",
    sources: ["Josephus, Antiquities 10 (background of Josiah's period)"]
  },

  Haggai: {
    summary: "Haggai delivered four brief but pointed messages in 520 BC to motivate the returned exiles to rebuild the Temple. His challenge to prioritize God's house above their own comfort, and his promise that the latter glory of the Temple will surpass the former, have an ultimate fulfillment in Christ.",
    themes: ["Putting God first", "The glory of the Second Temple exceeding the First — fulfilled in Christ (Hag. 2:9; John 2:19–21)", "Economic consequences of spiritual neglect", "Zerubbabel as a type of the Messiah", "Completing what God has begun"],
    author: "Haggai the prophet (1:1). He delivered four precisely dated oracles.",
    dating: "August–December 520 BC, precisely dated in the text.",
    sources: ["Josephus, Antiquities 11.4", "Zechariah (Haggai's contemporary)", "Persian royal records confirming Darius's reign"]
  },

  Zechariah: {
    summary: "Zechariah, a contemporary of Haggai, encouraged the returned exiles with eight night visions and prophecies of the coming Messiah. His messianic prophecies are the most detailed in the OT: the triumphal entry on a donkey (9:9), thirty pieces of silver (11:12–13), the pierced one (12:10), and the smitten Shepherd (13:7) are all directly fulfilled in the Gospels.",
    themes: ["The coming King — humble yet triumphant", "Cleansing and the removal of sin", "The Shepherd who is struck", "Jerusalem as the center of eschatological hope", "The Spirit empowers what human strength cannot (4:6)"],
    author: "Zechariah son of Berechiah (1:1), active 520–480 BC. The unity of chapters 1–8 and 9–14 is sometimes questioned, but the thematic continuity and NT attribution support single authorship.",
    dating: "520–480 BC, the period of Temple rebuilding and beyond.",
    sources: ["Josephus, Antiquities 11.4", "Matthew 21:5; 27:9–10 (fulfillments of Zechariah)", "Dead Sea Scrolls fragments of Zechariah"]
  },

  Malachi: {
    summary: "Malachi ('my messenger') closes the OT canon with a series of disputations addressing a post-exilic community grown complacent in worship and covenant faithfulness. His prophecy of 'Elijah' coming before the great Day of the LORD (4:5) is fulfilled in John the Baptist (Matt. 11:14).",
    themes: ["Covenant faithfulness in ordinary worship", "The coming messenger who prepares the way (3:1; 4:5–6)", "Robbing God — tithing and generosity", "Mixed marriages and covenant purity", "The sun of righteousness rising with healing in its wings (4:2)"],
    author: "Malachi (1:1), possibly a title ('my messenger') rather than a proper name, but Jewish tradition treats it as a proper name.",
    dating: "c. 450–430 BC, after Nehemiah's first governorship.",
    sources: ["Josephus, Antiquities 11 (post-exilic background)", "Matthew 11:14; 17:12 (John the Baptist as Elijah)"]
  },

  Matthew: {
    summary: "Matthew presents Jesus as the promised Messiah-King who fulfills the Old Testament. Written for a primarily Jewish audience, it emphasizes five major discourse sections (including the Sermon on the Mount), repeatedly showing that Jesus fulfills the Law and Prophets. It is the bridge between the Testaments.",
    themes: ["Jesus as the fulfillment of OT prophecy", "The Kingdom of Heaven", "Discipleship and the Church", "The Great Commission", "Emmanuel — God with us"],
    author: "Matthew (Levi) the tax collector, one of the Twelve. Papias of Hierapolis (c. 125 AD) is our earliest witness: 'Matthew collected the oracles in the Hebrew language.'",
    dating: "c. 50–70 AD. The absence of any reference to Jerusalem's fall (70 AD) as a past event suggests pre-70 composition.",
    evidence: [
      "Papias of Hierapolis (c. 125 AD), quoted by Eusebius (Ecclesiastical History 3.39.16): 'Matthew composed the logia in the Hebrew language, and each interpreted them as best he could.'",
      "Irenaeus (Against Heresies 3.1.1, c. 180 AD): 'Matthew among the Hebrews issued a written Gospel while Peter and Paul were preaching and founding the church in Rome.'",
      "The early church shows uniform attribution to Matthew — no competing attribution exists."
    ],
    sources: ["Papias (in Eusebius, EH 3.39.16)", "Irenaeus, Against Heresies 3.1.1", "Eusebius, Ecclesiastical History 3.24"]
  },

  Mark: {
    summary: "Mark is the briefest and most vivid of the Gospels — action-packed, urgent, and centered on Jesus's powerful deeds. Likely the first Gospel written, it presents Jesus as the Servant who came 'not to be served but to serve, and to give his life as a ransom for many' (10:45).",
    themes: ["Jesus as Servant and Son of God", "The Messianic secret", "Discipleship and its cost", "The cross as ransom", "Urgency — 'immediately' appears 40+ times"],
    author: "John Mark, a companion of Peter. Early church tradition unanimously identifies Mark as Peter's interpreter. Papias (c. 125 AD) states Mark 'wrote accurately all that he remembered' of Peter's teaching.",
    dating: "c. 45–65 AD. Many place it before Matthew and Luke as the first Gospel written.",
    evidence: [
      "Papias (quoted in Eusebius EH 3.39.15): 'Mark, having become the interpreter of Peter, wrote down accurately, though not in order, whatsoever he remembered of the things said or done by Christ.'",
      "Irenaeus, Against Heresies 3.1.1: 'After their departure [of Peter and Paul], Mark, the disciple and interpreter of Peter, himself also handed down to us in writing the things preached by Peter.'",
      "The Gospel's Petrine perspective is evident: vivid, eyewitness details, Peter's failures and restoration narrated with particular candor."
    ],
    sources: ["Papias (in Eusebius, EH 3.39.15)", "Irenaeus, Against Heresies 3.1.1", "Clement of Alexandria (in Eusebius, EH 6.14.6)"]
  },

  Luke: {
    summary: "Luke is the most literary of the Gospels — a carefully researched, ordered account addressed to Theophilus. It emphasizes Jesus's compassion for the poor, outcasts, women, and Gentiles. Together with Acts it forms a two-volume work tracing the mission of God from Galilee to Rome.",
    themes: ["Salvation for all people — Jew and Gentile", "The Holy Spirit in Jesus's ministry", "Prayer — Jesus prays at every major moment", "Joy and praise", "The Great Reversal — the proud are scattered, the humble exalted"],
    author: "Luke, the physician and companion of Paul (Col. 4:14; 2 Tim. 4:11; Philemon 24). The 'we' passages in Acts (16:10 onwards) confirm the author's direct involvement in Paul's missionary journeys.",
    dating: "c. 60–62 AD, before Acts (which ends with Paul under house arrest in Rome).",
    evidence: [
      "Irenaeus, Against Heresies 3.1.1: 'Luke also, the companion of Paul, recorded in a book the Gospel preached by him.'",
      "The Muratorian Fragment (c. 170–200 AD) names Luke the physician as the author.",
      "The 'we' passages in Acts (beginning at 16:10) mark the author as a firsthand participant in key events.",
      "The medical vocabulary noted by scholars (Hobart, 'Medical Language of St. Luke') is consistent with a physician-author."
    ],
    sources: ["Irenaeus, Against Heresies 3.1.1", "Muratorian Fragment", "Eusebius, Ecclesiastical History 3.4"]
  },

  John: {
    summary: "John is the most theological of the Gospels, written that readers 'may believe that Jesus is the Christ, the Son of God' (20:31). The prologue's identification of Jesus as the eternal Word (Logos) who became flesh, the seven 'I AM' sayings, and the extended Farewell Discourse make it the Gospel of divine glory and love.",
    themes: ["Jesus as the eternal Word — the divine Son", "'I AM' — Jesus and the divine name", "Believing/faith as the path to eternal life", "Love — the new commandment", "The glory of God revealed in the cross"],
    author: "John the Apostle, 'the beloved disciple' (21:20–24). Irenaeus, who knew Polycarp who knew John, is our strongest early witness.",
    dating: "c. 85–95 AD, the latest of the Gospels, written from Ephesus.",
    evidence: [
      "Irenaeus (Against Heresies 3.1.1): 'Afterwards, John, the disciple of the Lord, who also had leaned upon His breast, did himself publish a Gospel during his residence at Ephesus in Asia.'",
      "Polycarp of Smyrna, who knew John personally, was the teacher of Irenaeus — providing a direct chain of testimony.",
      "The Muratorian Fragment confirms Johannine authorship.",
      "The Gospel's distinctive 'beloved disciple' figure is identified as the author in 21:24 — consistent with John the Apostle."
    ],
    sources: ["Irenaeus, Against Heresies 3.1.1", "Eusebius, Ecclesiastical History 3.23–24", "Muratorian Fragment", "Polycarp's connection to John (via Irenaeus)"]
  },

  Acts: {
    summary: "Acts continues Luke's narrative from the Ascension through the spread of the gospel from Jerusalem to Rome. The Holy Spirit's arrival at Pentecost, the conversion of Paul, and the successive missionary journeys trace how 'the word of God grew and multiplied' across the Roman world.",
    themes: ["The Holy Spirit as the power of mission", "The gospel to all nations — Jew first and also Gentile", "The unstoppable advance of the Word of God", "Suffering as the normal path of witness", "The church as the new covenant community"],
    author: "Luke (same author as the Gospel of Luke — both addressed to Theophilus, Acts 1:1 references 'my former book').",
    dating: "c. 62 AD. Acts ends abruptly with Paul's Roman imprisonment, without mentioning his death (c. 64 AD) or Jerusalem's fall (70 AD) — strongly suggesting composition before these events.",
    sources: ["Irenaeus, Against Heresies 3.13–15", "Muratorian Fragment", "Clement of Rome, 1 Clement (reflecting early church period Acts describes)"]
  },

  Romans: {
    summary: "Romans is Paul's most systematic theological letter — a full account of the gospel. It covers universal sinfulness, justification by faith alone, union with Christ, the Spirit and sanctification, Israel's place in redemptive history, and the ethics of the new life.",
    themes: ["Justification by faith alone", "The righteousness of God revealed in the gospel", "Union with Christ — dying and rising with him", "The law, sin, and the Spirit", "Israel, the Gentiles, and the mystery of God's salvation"],
    author: "Paul the Apostle (1:1). One of the most universally accepted letters in all of antiquity. Even critical scholars who dispute other Pauline letters accept Romans.",
    dating: "c. 57 AD, written from Corinth during Paul's third missionary journey.",
    sources: ["Clement of Rome, 1 Clement (quotes Romans)", "Ignatius of Antioch (alludes to Romans)", "Muratorian Fragment"]
  },

  '1 Corinthians': {
    summary: "1 Corinthians addresses a divided, immature church in the cosmopolitan city of Corinth. Paul deals with factionalism, sexual immorality, lawsuits, marriage, food sacrificed to idols, spiritual gifts, and the resurrection — always returning to the cross as the center and standard of true wisdom.",
    themes: ["The wisdom of the cross versus worldly wisdom", "The body of Christ — unity in diversity", "Love as the greatest gift (ch. 13)", "Order and spiritual gifts in worship", "The resurrection as the foundation of Christian hope (ch. 15)"],
    author: "Paul (1:1). Universally accepted.",
    dating: "c. 55 AD, from Ephesus.",
    sources: ["Clement of Rome, 1 Clement 47 (explicitly quotes 1 Corinthians)", "Muratorian Fragment"]
  },

  '2 Corinthians': {
    summary: "2 Corinthians is Paul's most personal letter — a defense of his apostolic ministry against false apostles, and a profound meditation on weakness, suffering, and the power of God. The 'new covenant ministry' sections (chs. 3–5) are among Paul's most theologically rich.",
    themes: ["Strength through weakness", "The new covenant ministry of the Spirit", "Genuine apostolic suffering versus false apostles' boasting", "Generosity and the grace of giving", "Reconciliation as the ministry of the gospel"],
    author: "Paul (1:1). Universally accepted.",
    dating: "c. 56 AD, from Macedonia.",
    sources: ["Polycarp, Epistle to the Philippians (alludes to Pauline letters)", "Muratorian Fragment"]
  },

  Galatians: {
    summary: "Galatians is Paul's most urgent letter — written in white heat to rebuke churches turning from the gospel of grace to a gospel of works. The contrast between law and faith, flesh and Spirit, bondage and freedom, makes it the Magna Carta of Christian liberty and the source of Luther's Reformation.",
    themes: ["Justification by faith alone, not works of the law", "The Abrahamic covenant fulfilled in Christ", "Freedom from the law's condemnation", "The fruit of the Spirit versus the works of the flesh", "The new creation — in Christ there is neither Jew nor Greek"],
    author: "Paul (1:1). Universally accepted.",
    dating: "c. 49 AD (early date, before Jerusalem Council) or c. 53 AD (later date). One of Paul's earliest letters.",
    sources: ["Ignatius of Antioch (alludes to Galatians)", "Marcion's canon included Galatians — confirming early recognition", "Muratorian Fragment"]
  },

  Ephesians: {
    summary: "Ephesians presents the grand vision of the Church as the body and bride of Christ — the eternal purpose of God to unite all things in Christ. It moves from the highest theology of election and redemption (chs. 1–3) to the most practical ethics of new life (chs. 4–6), held together by 'walk worthy.'",
    themes: ["Election and the eternal purpose of God", "The Church as Christ's body and the fullness of God", "Reconciliation of Jew and Gentile in one body", "The armor of God against spiritual warfare", "Marriage as a picture of Christ and the Church"],
    author: "Paul (1:1). Accepted as Pauline by Irenaeus, Clement, Origen, and all early writers.",
    dating: "c. 60–62 AD, a 'Prison Epistle' written during Paul's Roman imprisonment.",
    sources: ["Irenaeus, Against Heresies 1.8.5 (quotes Ephesians)", "Clement of Rome, 1 Clement (alludes)", "Muratorian Fragment"]
  },

  Philippians: {
    summary: "Philippians is Paul's most joyful letter, written from prison. It radiates contentment, partnership in the gospel, and the humility of Christ as the supreme example. The 'Christ hymn' of chapter 2 (2:5–11) is one of the NT's most profound statements of the Incarnation.",
    themes: ["Joy in all circumstances", "The humility of Christ as our pattern", "Partnership in the gospel", "Contentment as a learned discipline", "The peace of God that surpasses understanding"],
    author: "Paul (1:1). Universally accepted.",
    dating: "c. 61–62 AD, during Paul's Roman imprisonment.",
    sources: ["Polycarp, Epistle to the Philippians (explicitly written to the same church)", "Clement of Rome (alludes to Philippians)"]
  },

  Colossians: {
    summary: "Colossians counters an early proto-Gnostic philosophy that reduced Christ to one of many spiritual powers. Paul responds with the highest Christology in his letters: Christ is the 'firstborn of all creation,' in whom 'all the fullness of the Deity dwells bodily,' and who is the supreme head of all authority.",
    themes: ["The supremacy of Christ over all creation and powers", "Fullness of life in Christ alone", "Warning against religious syncretism and mysticism", "The new humanity — put off the old, put on the new", "Prayer, wisdom, and the word of Christ"],
    author: "Paul (1:1). Accepted as Pauline by the early fathers. Some critical scholars question it, but the vocabulary differences are better explained by the unique heresy Paul is addressing.",
    dating: "c. 60–62 AD, a Prison Epistle.",
    sources: ["Irenaeus, Against Heresies 3.14.1 (quotes Colossians)", "Muratorian Fragment"]
  },

  '1 Thessalonians': {
    summary: "1 Thessalonians is likely Paul's earliest surviving letter, a warm pastoral letter to a young church facing persecution. It encourages them in faith, addresses questions about Christians who have died before Christ's return, and urges holy living as preparation for the Day of the Lord.",
    themes: ["Encouragement in persecution", "The return of Christ and the resurrection", "Holy living as preparation for Christ's coming", "The model of servant ministry", "Thanking God in all circumstances"],
    author: "Paul (1:1). One of the most universally accepted Pauline letters.",
    dating: "c. 50–51 AD, from Corinth — one of Paul's earliest letters.",
    sources: ["Muratorian Fragment", "Irenaeus, Against Heresies"]
  },

  '2 Thessalonians': {
    summary: "2 Thessalonians follows shortly after the first letter, correcting misunderstandings about Christ's return. Some believers had stopped working, convinced the Day of the Lord had already come. Paul describes events that must precede the end, including the 'man of lawlessness.'",
    themes: ["Correct understanding of the Day of the Lord", "The man of lawlessness — the final rebellion", "Working faithfully while waiting", "God's judgment on those who reject the gospel", "Standing firm in apostolic tradition"],
    author: "Paul (1:1). Accepted by the majority of scholars; some question it, but patristic citations confirm early recognition.",
    dating: "c. 51–52 AD, shortly after 1 Thessalonians.",
    sources: ["Muratorian Fragment", "Irenaeus, Against Heresies 3.7"]
  },

  '1 Timothy': {
    summary: "1 Timothy is Paul's first letter to his young delegate Timothy at Ephesus, giving instructions for church order, sound doctrine, qualifications for leadership, and personal godliness. It provides the church's foundational charter for leadership and worship.",
    themes: ["Sound doctrine versus false teaching", "Qualifications for elders and deacons", "Prayer for all people including rulers", "Godliness as the purpose of sound doctrine", "Instructions for different groups in the church"],
    author: "Paul (1:1). Claimed by Paul and accepted by Irenaeus, Clement, and virtually all early fathers.",
    dating: "c. 63–65 AD, between Paul's Roman imprisonments.",
    evidence: [
      "Clement of Rome (1 Clement, c. 96 AD) and Ignatius of Antioch (c. 107 AD) both reflect knowledge of the Pastorals.",
      "Polycarp of Smyrna (Epistle to the Philippians, c. 110 AD) directly quotes 1 Timothy 6:10 and 6:7, confirming the letter's early circulation and acceptance.",
      "The vocabulary differences from other Pauline letters are better explained by the different genre, different addressees, later stage of Paul's life, and the use of an amanuensis.",
      "The historical situation (Timothy in Ephesus, Paul free to travel) fits the period between Paul's two Roman imprisonments."
    ],
    sources: ["Polycarp, Epistle to the Philippians 4 (quotes 1 Tim. 6:10, 6:7)", "Clement of Rome, 1 Clement", "Ignatius of Antioch letters"]
  },

  '2 Timothy': {
    summary: "2 Timothy is Paul's final letter — his farewell, written from Roman imprisonment shortly before his martyrdom. It charges Timothy to continue faithful ministry, endure suffering, guard sound doctrine, and preach the word in season and out. The famous 'all Scripture is God-breathed' passage (3:16) is here.",
    themes: ["Faithful endurance in ministry", "The God-breathed nature of Scripture", "Guard the deposit — sound doctrine", "Suffering as the badge of faithful ministry", "Final hope — 'the crown of righteousness'"],
    author: "Paul (1:1). The personal tone, imprisonment setting, and approaching death are consistent with Paul's final days in Rome (c. 67 AD).",
    dating: "c. 67 AD, during Paul's second Roman imprisonment, shortly before his martyrdom.",
    sources: ["Polycarp, Philippians (reflects Pauline tradition)", "Clement of Alexandria, Stromata (quotes the Pastorals)", "Muratorian Fragment"]
  },

  Titus: {
    summary: "Titus instructs Paul's delegate Titus on organizing the newly planted churches on Crete: appointing qualified elders, refuting false teachers, and teaching sound doctrine to every group in the church. The famous 'grace of God that brings salvation has appeared to all men' (2:11) is a Pastoral highpoint.",
    themes: ["Sound doctrine producing good works", "Qualifications for elders", "The appearing of grace — Christ as our hope", "The renewing work of the Holy Spirit (3:5–6)", "Godliness as the fruit of the gospel"],
    author: "Paul (1:1). Same authorship tradition as 1–2 Timothy.",
    dating: "c. 63–65 AD, between Paul's two Roman imprisonments.",
    sources: ["Polycarp, Philippians", "Clement of Alexandria", "Muratorian Fragment"]
  },

  Philemon: {
    summary: "Philemon is Paul's shortest letter — a personal appeal to a slave owner to receive back his runaway slave Onesimus (now a Christian) as a brother in Christ. It does not condemn slavery directly but plants seeds that ultimately undermine it, making the gospel's social implications clear.",
    themes: ["Christian brotherhood across social divisions", "Forgiveness and restoration", "Intercession and advocacy", "The gospel's power to transform relationships", "Paul's apostolic authority used in humble appeal"],
    author: "Paul (v. 1). Universally accepted, even by the most critical scholars.",
    dating: "c. 60–62 AD, a Prison Epistle.",
    sources: ["Colossians 4:9 (Onesimus mentioned)", "Ignatius of Antioch, To the Ephesians (Onesimus may be the bishop mentioned)"]
  },

  Hebrews: {
    summary: "Hebrews is the NT's most sustained argument for the supremacy of Christ — the final, perfect High Priest whose sacrifice fulfills and supersedes all of the Mosaic system. Written to Jewish Christians tempted to revert to Judaism, it demonstrates that Jesus is greater than angels, Moses, Joshua, Aaron, and the Levitical covenant.",
    themes: ["The supremacy of Christ over all", "The better covenant, better sacrifice, better High Priest", "Faith as forward-looking trust in God's promises (ch. 11)", "The danger of apostasy — do not drift", "Sabbath rest that remains for God's people"],
    author: "Anonymous. The author is not named. Early candidates include Paul (Tertullian), Apollos (Luther), Barnabas, Priscilla, and Luke. The style and vocabulary differ significantly from Paul's letters, though the theology is Pauline.",
    dating: "Before 70 AD — the Temple and its sacrifices are described as ongoing present realities, which would be an extraordinary omission had it already fallen.",
    evidence: [
      "The letter was known to Clement of Rome (c. 96 AD), who quotes it extensively in 1 Clement — confirming its circulation and authority by the end of the 1st century.",
      "Clement of Alexandria (in Eusebius, EH 6.14.4) suggested Paul wrote it in Hebrew and Luke translated it.",
      "Origen (in Eusebius, EH 6.25.11–14): 'The thoughts are the apostle's, but the language and composition belong to one who wrote down what the apostle said... Who wrote the epistle, God truly knows.'"
    ],
    sources: ["Clement of Rome, 1 Clement (extensive quotation of Hebrews)", "Origen (in Eusebius, EH 6.25)", "Clement of Alexandria (in Eusebius, EH 6.14)"]
  },

  James: {
    summary: "James is the most practical NT letter — a Jewish-Christian wisdom book addressing the gap between faith and works. Written by the Lord's own brother, it calls believers to genuine faith expressed in caring for the poor, taming the tongue, and patient endurance.",
    themes: ["Faith without works is dead", "Wisdom from above versus worldly wisdom", "The power and danger of the tongue", "Care for the poor as pure religion", "Patient endurance under trial"],
    author: "James the Just, brother of Jesus and leader of the Jerusalem church (1:1; cf. Gal. 1:19; Acts 15). His martyrdom is recorded by Josephus (Antiquities 20.9.1).",
    dating: "c. 45–50 AD — among the earliest NT letters, before the Jerusalem Council (49 AD).",
    evidence: [
      "Josephus (Antiquities 20.9.1) records the martyrdom of 'James the brother of Jesus who was called Christ' in 62 AD — confirming his historical existence and prominence.",
      "Eusebius (EH 2.23) records detailed accounts of James's ministry and death, drawing on Hegesippus.",
      "Origen and Eusebius both acknowledge some disputed its canonicity early, but it was widely received and cited."
    ],
    sources: ["Josephus, Antiquities 20.9.1 (James's martyrdom)", "Eusebius, EH 2.23 (Hegesippus's account of James)", "Origen, Commentary on John 19.6"]
  },

  '1 Peter': {
    summary: "1 Peter is written to scattered Christians facing persecution — 'elect exiles' — calling them to holy living, submission to authorities, and joyful endurance of suffering. Peter interprets their suffering through the lens of Christ's own suffering and resurrection, pointing forward to the 'unfading inheritance.'",
    themes: ["Suffering as participation in Christ's sufferings", "Holy living in exile", "The precious cornerstone — Christ as the foundation", "Hope as the anchor of endurance", "The priesthood of all believers"],
    author: "Peter the Apostle (1:1), writing from 'Babylon' (Rome). Early church tradition unanimously confirms Petrine authorship.",
    dating: "c. 62–65 AD, from Rome, shortly before Peter's martyrdom under Nero.",
    evidence: [
      "Polycarp of Smyrna (Epistle to the Philippians, c. 110 AD) quotes 1 Peter multiple times, confirming its early circulation and Petrine authority.",
      "Clement of Rome (1 Clement, c. 96 AD) reflects knowledge of 1 Peter.",
      "Irenaeus, Tertullian, and Clement of Alexandria all cite 1 Peter as Petrine.",
      "The letter's Greek quality (noted by critics) is easily explained by Silvanus as Peter's amanuensis (5:12)."
    ],
    sources: ["Polycarp, Epistle to the Philippians (multiple quotations)", "Clement of Rome, 1 Clement", "Irenaeus, Against Heresies 4.9.2"]
  },

  '2 Peter': {
    summary: "2 Peter is Peter's final letter, written in the face of his approaching martyrdom. It warns against false teachers who will arise, defends the reality of Christ's return against scoffers, and calls believers to grow in grace and knowledge.",
    themes: ["Growing in grace and knowledge", "The divine authority of Scripture — prophecy not of private interpretation", "Warning against false teachers and their destruction", "The Day of the Lord — cosmic judgment and new creation", "Patience in awaiting Christ's return"],
    author: "Peter the Apostle (1:1). Disputed more than almost any NT letter, but defended as genuinely Petrine by strong evidence.",
    dating: "c. 65–68 AD, from Rome, just before Peter's martyrdom under Nero.",
    evidence: [
      "Peter explicitly claims eyewitness testimony of the Transfiguration (1:16–18) — a claim that would be fraudulent if written by an impostor.",
      "The letter's reference to 'this is now the second letter I have written to you' (3:1) directly links it to 1 Peter.",
      "Origen acknowledged 2 Peter as disputed but leaned toward its acceptance; Eusebius placed it among the 'disputed but known' books.",
      "By the time of Athanasius's canonical list (367 AD) and the Councils of Hippo (393) and Carthage (397), 2 Peter was universally received as canonical."
    ],
    sources: ["Origen (in Eusebius, EH 6.25.8)", "Eusebius, EH 3.3.1–4", "Athanasius, 39th Festal Letter (367 AD)"]
  },

  '1 John': {
    summary: "1 John is a pastoral letter testing genuine Christianity: do you believe that Jesus Christ has come in the flesh? Do you walk in the light? Do you love the brothers? These three tests — doctrinal, moral, and relational — run through the letter. It was written to counter early Gnostic/Docetic teaching.",
    themes: ["God is light — walking in the light", "God is love — loving one another", "The incarnation of Jesus is non-negotiable", "Assurance of salvation: 'that you may know'", "Overcoming the world through faith"],
    author: "John the Apostle. Eusebius, Origen, Clement, and Irenaeus all affirm Johannine authorship. The vocabulary and style are virtually identical to the Gospel of John.",
    dating: "c. 85–95 AD, from Ephesus.",
    sources: ["Polycarp (who knew John personally)", "Irenaeus, Against Heresies (multiple citations)", "Clement of Alexandria"]
  },

  '2 John': {
    summary: "2 John is a brief letter from 'the Elder' to a 'chosen lady and her children' (likely a local church), warning against receiving false teachers who denied Christ's incarnation and calling for love and obedience to the original apostolic teaching.",
    themes: ["Truth and love walking together", "Refusing hospitality to false teachers", "Abiding in the teaching of Christ", "The original commandment — love one another"],
    author: "John the Apostle ('the Elder', a title of age and authority). Accepted by Irenaeus, Clement, and Origen.",
    dating: "c. 85–95 AD.",
    sources: ["Irenaeus, Against Heresies 1.16.3 (quotes 2 John 10–11)", "Clement of Alexandria", "Eusebius, EH 3.25"]
  },

  '3 John': {
    summary: "3 John is the shortest NT book — a personal letter from 'the Elder' to Gaius, commending him for his hospitality to traveling missionaries, rebuking the domineering Diotrephes, and commending Demetrius. It offers a glimpse into real early church conflicts.",
    themes: ["Walking in the truth", "Hospitality as gospel partnership", "The abuse of church authority (Diotrephes)", "Faithful witness building the church"],
    author: "John the Apostle ('the Elder'). Same author as 2 John.",
    dating: "c. 85–95 AD.",
    sources: ["Eusebius, EH 3.25", "Origen (cited in Eusebius)"]
  },

  Jude: {
    summary: "Jude is a short but fierce letter warning against false teachers who had crept into the church — people who 'turn the grace of our God into a license for immorality.' Jude urges believers to 'contend earnestly for the faith once delivered to the saints' (v. 3).",
    themes: ["Contending for the faith", "The danger of antinomian false teachers", "Historical judgments as warnings (Sodom, fallen angels)", "Doxology — God is able to keep you from stumbling", "Building yourself up in your most holy faith"],
    author: "Jude, 'a servant of Jesus Christ and brother of James' (v. 1) — a biological brother of Jesus (cf. Mark 6:3).",
    dating: "c. 65–80 AD. The relationship to 2 Peter (Jude 4–13 parallels 2 Peter 2:1–18) is widely noted; most scholars believe Jude preceded 2 Peter.",
    sources: ["Clement of Alexandria, Hypotyposes (comments on Jude)", "Tertullian, De cultu feminarum (cites Jude)", "Origen (accepts Jude's authority)"]
  },

  Revelation: {
    summary: "Revelation is the NT's great prophetic-apocalyptic book — a vision given to John of Jesus Christ's ultimate victory over Satan, the Beast, and Death. Through vivid imagery drawn heavily from the OT prophets, it encourages persecuted believers that the Lamb who was slain is now the King of kings, and that history is moving toward the new creation.",
    themes: ["The sovereignty of the Lamb over all history", "Worship — the proper response to divine revelation", "Persecution, martyrdom, and ultimate vindication", "The final defeat of Satan, the Beast, and Death", "The new creation — God dwelling with his people forever"],
    author: "John the Apostle (1:1, 9; 22:8), by the strongest early tradition. Justin Martyr (c. 150 AD) is the first to explicitly name John the Apostle as the author.",
    dating: "c. 95–96 AD, during the reign of Domitian (Irenaeus's testimony). An earlier date (c. 64–68 AD, Nero's reign) is held by some scholars based on internal evidence.",
    evidence: [
      "Irenaeus (Against Heresies 5.30.3): 'For that was seen no very long time since, but almost in our day, towards the end of Domitian's reign' — placing composition c. 95–96 AD.",
      "Justin Martyr (Dialogue with Trypho 81, c. 150 AD): 'a man among us whose name is John, one of the apostles of Christ' wrote Revelation.",
      "Clement of Alexandria (in Eusebius, EH 3.23) treats John's exile to Patmos and return after Domitian's death as established history.",
      "The seven churches of Asia Minor (chs. 2–3) were real, historical congregations — confirmed by archaeological evidence at Ephesus, Sardis, Laodicea, and Pergamum."
    ],
    sources: ["Irenaeus, Against Heresies 5.30.3", "Justin Martyr, Dialogue with Trypho 81", "Eusebius, EH 3.18, 3.23", "Archaeology of the Seven Churches"]
  }
}

/**
 * Format a BookPreface into a readable multi-paragraph string
 * for display in the ReaderScreen chapter-0 preface view.
 */
export function formatBookPreface(p: BookPreface): string {
  let out = p.summary

  out += '\n\n' + `Author: ${p.author}`
  out += '\n\n' + `Date: ${p.dating}`
  out += '\n\n' + 'Key Themes:\n' + p.themes.map(t => `• ${t}`).join('\n')

  if (p.evidence && p.evidence.length > 0) {
    out += '\n\n' + 'Evidence & Notes:\n' + p.evidence.map(e => `• ${e}`).join('\n')
  }

  out += '\n\n' + 'Sources: ' + p.sources.join(' · ')

  return out
}

export function getBookPreface(book: string): string | null {
  const p = PREFACES[book]
  return p ? formatBookPreface(p) : null
}

export function getRawBookPreface(book: string): BookPreface | null {
  return PREFACES[book] ?? null
}
