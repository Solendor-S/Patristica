export interface Doctrine {
  id: string
  label: string
  description: string
  development: string  // simplified arc of how this doctrine developed
}

// Era boundaries by the year a text was written (curated entries carry a `year`)
export const DOCTRINE_ERAS = [
  { label: 'Ante-Nicene (to 325)',   maxYear: 324 },
  { label: 'Nicene (325–451)',       maxYear: 451 },
  { label: 'Post-Chalcedon (451–800)', maxYear: 800 },
  { label: 'Medieval',               maxYear: 9999 },
] as const

export const DOCTRINES: Doctrine[] = [
  {
    id: 'trinity',
    label: 'Trinity',
    description: 'The development of Trinitarian theology from early baptismal formulas through the Nicene and post-Nicene controversies.',
    development: 'The earliest Christians baptised in the name of Father, Son, and Spirit without formal theology behind it. Justin Martyr (c. 150) and Tertullian (c. 200) began to articulate the distinction of persons — Tertullian coined the Latin word "trinitas." The crisis came when Arius (c. 318) taught that the Son was a creature. Nicaea (325) condemned this and affirmed the Son as "of one substance" (homoousios) with the Father. The Cappadocian Fathers — Basil, Gregory of Nyssa, and Gregory Nazianzus — then gave the doctrine its lasting shape: one divine essence (ousia), three distinct persons (hypostases). The Council of Constantinople (381) extended this to the Holy Spirit, completing the classical Trinitarian formula.',
  },
  {
    id: 'incarnation',
    label: 'Incarnation',
    description: 'How the fathers understood the Word becoming flesh — two natures, one person, and the hypostatic union.',
    development: 'Ignatius of Antioch insisted against the Docetists that Christ truly suffered in the flesh. Justin and Irenaeus developed the idea of the eternal Word taking on humanity to restore what Adam lost. The question sharpened in the 5th century: Nestorius of Constantinople taught a loose union of two persons, while Cyril of Alexandria defended that Mary could be called Theotokos (God-bearer) because Christ is one divine person. Ephesus (431) sided with Cyril. Then Eutyches went too far the other way, collapsing Christ\'s humanity into his divinity. Chalcedon (451) settled the question: Christ is one person in two complete natures — divine and human — without mixture, confusion, separation, or division.',
  },
  {
    id: 'eucharist',
    label: 'Eucharist',
    description: 'Patristic teaching on the Lord\'s Supper — real presence, sacrifice, thanksgiving, and the body and blood of Christ.',
    development: 'Ignatius (c. 108) already called the Eucharist "the flesh of our Saviour" and a "medicine of immortality." Justin Martyr described it as the true body and blood and linked it to the Incarnation. By the 4th century, Cyril of Jerusalem\'s Catechetical Lectures gave the fullest early account of eucharistic transformation — the bread and wine truly become the body and blood through the Holy Spirit\'s epiclesis. John Chrysostom emphasised the sacrifice offered on the altar as a re-presentation of Calvary. In the West, Ambrose stressed the words of institution as the moment of change, while Augustine\'s more symbolic language created a lasting tension about the precise nature of Christ\'s presence — a tension that would occupy the medieval and Reformation eras.',
  },
  {
    id: 'baptism',
    label: 'Baptism',
    description: 'The fathers on baptism as regeneration, forgiveness of sins, initiation, and its relation to faith and the Spirit.',
    development: 'From the beginning, baptism was understood as the doorway into the church — not merely a symbol but the actual washing away of sins and rebirth by the Spirit (Titus 3:5). Tertullian described it as a seal against the devil, while Cyprian insisted on rebaptism of heretics (a view Rome rejected). The Donatist controversy in North Africa forced a sharper question: does the minister\'s holiness affect the sacrament? Augustine answered decisively: no — baptism belongs to Christ, not the minister, and it leaves a permanent mark (character) on the soul. Infant baptism, practiced at least from the 3rd century, was debated by Pelagius who denied original sin; Augustine\'s defense of infant baptism became inseparable from his doctrine of original sin and grace.',
  },
  {
    id: 'grace',
    label: 'Grace & Free Will',
    description: 'From Pelagius through Augustine and beyond — the relationship between divine grace and human freedom.',
    development: 'The early fathers generally affirmed both God\'s grace and human responsibility without a formal system. The decisive controversy erupted when the British monk Pelagius (c. 400) taught that humans have the natural ability to choose good and obey God without needing divine grace. Augustine of Hippo responded with the most thorough theology of grace in antiquity: fallen humanity cannot choose good without God\'s prior grace, and those who are saved are predestined by God\'s sovereign mercy. The Semi-Pelagian position — that humans take the first step and God responds — emerged in Gaul (Cassian, Faustus of Riez) as a middle way. The Council of Orange (529) largely affirmed Augustine\'s position on prevenient grace while rejecting double predestination. The debate never fully resolved and resurfaced at the Reformation.',
  },
  {
    id: 'scripture',
    label: 'Scripture',
    description: 'Patristic approaches to biblical inspiration, authority, canon, and interpretation (allegory vs. literal).',
    development: 'The earliest fathers quoted the Old Testament as fulfilled prophecy and the apostolic writings as equally authoritative. Clement of Alexandria and Origen developed the allegorical method — arguing that Scripture has multiple senses (literal, moral, spiritual) and that the deeper spiritual meaning is often the real one. The Antiochene school (Diodorus of Tarsus, Theodore of Mopsuestia, Chrysostom) pushed back: Scripture\'s literal-historical sense must be the foundation. Jerome\'s Vulgate (c. 400) gave the West a standard Latin Bible; he controversially preferred the Hebrew Old Testament over the Septuagint. Augustine\'s rules for interpretation in De Doctrina Christiana became the standard Western framework. All fathers agreed the Spirit inspired Scripture and that the church\'s rule of faith governed its interpretation.',
  },
  {
    id: 'atonement',
    label: 'Atonement',
    description: 'How Christ\'s death saves — ransom, victory over death, satisfaction, moral influence, and deification.',
    development: 'The early fathers did not systematize the atonement but used vivid imagery. Irenaeus spoke of "recapitulation" — Christ retracing and redeeming every step of Adam\'s fall. Origen developed the ransom theory: Christ paid a ransom to the devil to liberate humanity. Athanasius emphasized deification and victory over death — God became human so that humans might become divine, and Christ\'s resurrection broke death\'s power. Chrysostom and others saw the cross as a sacrifice that satisfies divine justice. In the Latin West, Tertullian\'s legal vocabulary (satisfaction, merit) laid groundwork for Anselm\'s later satisfaction theory. Augustine held multiple metaphors together without reducing them to one. The patristic era bequeathed a rich, multi-faceted understanding rather than a single theory.',
  },
  {
    id: 'resurrection',
    label: 'Resurrection',
    description: 'The bodily resurrection of Christ and its implications for the resurrection of the dead.',
    development: 'Against Gnostic denials, the 2nd-century fathers (Ignatius, Polycarp, Justin, Irenaeus) insisted on the literal, bodily resurrection of both Christ and believers. The body is not a prison to escape but part of God\'s good creation destined for redemption. Tertullian wrote an entire treatise on the resurrection of the flesh. The philosophical challenge was the soul-body relationship: Origen controversially taught a spiritual resurrection body that barely resembled the earthly body — a position later condemned. Gregory of Nyssa and Augustine defended the identity of the resurrected body with the earthly one while acknowledging its glorified transformation. The resurrection was understood not as resuscitation but as transformation to incorruptibility — the first fruits of the new creation.',
  },
  {
    id: 'church',
    label: 'Church & Ministry',
    description: 'The nature of the church, apostolic succession, episcopate, and the marks of the true church.',
    development: 'Ignatius of Antioch (c. 108) is the earliest witness to the threefold ministry of bishop, presbyter, and deacon — and to the bishop as the centre of unity. Irenaeus used apostolic succession to argue against the Gnostics: the true faith can be traced in an unbroken line from the apostles through their successors. Cyprian of Carthage gave the episcopal church its classic Latin theology: "outside the church there is no salvation," and the unity of the church is embodied in the unity of the bishops. The Donatist crisis forced Augustine to distinguish between the visible and invisible church and between valid sacraments and sanctifying grace. By the late patristic period, Rome\'s claim to primacy was developing — accepted in the West, contested in the East — setting the stage for later divisions.',
  },
  {
    id: 'eschatology',
    label: 'Last Things',
    description: 'Patristic teaching on death, judgment, heaven, hell, purgatory, and the end times.',
    development: 'The earliest Christians expected Christ\'s imminent return. When the parousia was delayed, the church developed a more nuanced eschatology. Many Ante-Nicene fathers (Justin, Irenaeus, Tertullian) held a form of millenarianism — a literal thousand-year reign of Christ on earth before the final judgment. Origen allegorized the millennium and rejected a literal earthly kingdom. After Constantine, Eusebius and Augustine reinterpreted Revelation: the millennium is the present age of the church, not a future earthly reign. Augustine\'s City of God gave the West its dominant eschatological framework — history as the conflict between two cities, ending in the final separation at judgment. Purgatory as a place of post-death purification developed gradually, more explicitly in Gregory the Great in the West; the East retained a different, less defined understanding.',
  },
  {
    id: 'prayer',
    label: 'Prayer & Worship',
    description: 'The fathers on the nature, forms, and practice of Christian prayer and liturgical worship.',
    development: 'The Didache (c. 100) already gives structured instructions for prayer and the Eucharist, showing liturgy forming very early. Tertullian and Origen wrote the first systematic treatises on prayer, emphasising the Lord\'s Prayer as the model and defining true prayer as lifting the mind to God. Cyril of Jerusalem\'s mystagogical catecheses (c. 350) reveal how elaborate and theologically rich the baptismal liturgy had become. John Chrysostom\'s homilies on the Lord\'s Prayer and the nature of prayer shaped Eastern piety. In the desert tradition, Evagrius Ponticus defined prayer as "the laying aside of thoughts" — the beginning of contemplative theology. By Gregory the Great, the Western liturgy had taken its basic shape, and prayer was understood as both vocal liturgy and inner contemplation of God.',
  },
  {
    id: 'icons',
    label: 'Icon Veneration',
    description: 'The slow, contested development of Christian images and their veneration — from early reserve and early Christian art, through the Iconoclast controversy, to the Second Council of Nicaea.',
    development: 'Second- and third-century apologists such as Origen and Lactantius told pagan critics that Christians honoured no images. They were rejecting pagan idols and the idea that an image could represent the invisible God, though later iconoclasts turned their words against Christian images too. Christian art nonetheless appears early: Tertullian mentions the Good Shepherd painted on eucharistic cups, and the house church at Dura-Europos (c. 240–256) had wall paintings of Christ healing and walking on water. Around 305 a synod of nineteen Spanish bishops at Elvira ruled that "pictures ought not to be in church, lest what is worshipped and adored be painted on the walls." Some read the canon as a general ban; others as protecting sacred subjects during persecution. Either way it was a regional council, and it probably presupposes that such pictures existed.\n\nThe fourth century shows both currents. Eusebius saw a statue at Paneas said to be of Jesus and reported painted likenesses of Christ, Peter and Paul, ascribing the custom to Gentile habit. A letter attributed to him, refusing Constantine\'s sister an image of Christ, survives only through later iconoclasts and their opponents, and its authenticity is debated. Jerome\'s translation of a letter of Epiphanius of Salamis (394) describes him tearing down a church curtain painted with a figure "of Christ or of one of the saints"; that postscript and other anti-image texts ascribed to Epiphanius were called forgeries at Nicaea II and are still disputed. In the same century Basil wrote that "the honour paid to the image passes on to the prototype" (said of the Son as image of the Father, and later the key text for icons), Gregory of Nyssa wept before a painting of the sacrifice of Isaac, and Augustine condemned "worshippers of tombs and pictures" while distinguishing the honour paid to martyrs from the worship (latreia) due to God alone.\n\nAround 600 Gregory the Great rebuked Bishop Serenus of Marseilles for smashing church images: pictures let the unlettered "read" the story, so they should be kept, but they must not be adored. Whether his "adoration" (adorare) means the worship due to God, which Nicaea II also forbade, or rules out any honour to images, is still debated. Over the sixth and seventh centuries prostrations, lights and finally incense before images became attested.\n\nImperial iconoclasm began under Leo III in the 720s–730s. His son Constantine V argued that an image of Christ must either circumscribe the uncircumscribable divine nature or separate the humanity from it, and the Council of Hieria (754) — attended by 338 bishops but no pope or patriarchs — condemned images as idolatry. John of Damascus, writing beyond the emperor\'s reach in Muslim-ruled Palestine, answered that the Incarnation made the invisible God visible, so depicting Christ\'s flesh confesses the Incarnation; he distinguished latreia, the worship due to God alone, from a relative veneration that passes to the person depicted. The Second Council of Nicaea (787), with papal legates present, restored images: they receive honour and veneration (proskynesis), with lights and incense "as was the pious custom of the ancients," but not the latreia due to God, "for the honour of the image passes to its prototype." In the West the Frankish Libri Carolini and the Council of Frankfurt (794) objected, working partly from a faulty Latin translation. A second iconoclast period (815–843) ended with the restoration still kept in the East as the "Triumph of Orthodoxy."',
  },
  {
    id: 'deification',
    label: 'Deification (Theosis)',
    description: 'The Eastern patristic teaching on participation in the divine nature — becoming by grace what God is by nature.',
    development: 'Irenaeus first articulated the exchange at the heart of salvation: "God became man so that man might become god." This was not pantheism but participation — humanity sharing in the divine life through grace. Athanasius made it central to his soteriology: the Word became flesh so that we might be "deified." The Cappadocians developed it through the distinction between God\'s unknowable essence and his communicable energies — humans can participate in God\'s life without merging with his being. Maximus the Confessor (7th century) gave theosis its most sophisticated form, integrating Christology and anthropology: the Incarnation enables the full deification of humanity. In the West, Augustine spoke of participation in God but the concept never had quite the same centrality; by the medieval period it was more prominent in Eastern theology and mysticism.',
  },
]
