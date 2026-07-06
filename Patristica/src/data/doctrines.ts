export interface Doctrine {
  id: string
  label: string
  description: string
  development: string  // simplified arc of how this doctrine developed
  keywords: string[]
}

// Era boundaries by father sort year
export const DOCTRINE_ERAS = [
  { label: 'Ante-Nicene',  maxSort: 280 },
  { label: 'Nicene',       maxSort: 400 },
  { label: 'Post-Nicene',  maxSort: 800 },
  { label: 'Medieval',     maxSort: 9999 },
] as const

export const DOCTRINES: Doctrine[] = [
  {
    id: 'trinity',
    label: 'Trinity',
    description: 'The development of Trinitarian theology from early baptismal formulas through the Nicene and post-Nicene controversies.',
    development: 'The earliest Christians baptised in the name of Father, Son, and Spirit without formal theology behind it. Justin Martyr (c. 150) and Tertullian (c. 200) began to articulate the distinction of persons — Tertullian coined the Latin word "trinitas." The crisis came when Arius (c. 318) taught that the Son was a creature. Nicaea (325) condemned this and affirmed the Son as "of one substance" (homoousios) with the Father. The Cappadocian Fathers — Basil, Gregory of Nyssa, and Gregory Nazianzus — then gave the doctrine its lasting shape: one divine essence (ousia), three distinct persons (hypostases). The Council of Constantinople (381) extended this to the Holy Spirit, completing the classical Trinitarian formula.',
    keywords: ['trinity', 'three persons', 'homoousios', 'consubstantial', 'one substance', 'father and son', 'holy spirit', 'godhead', 'triune', 'co-equal'],
  },
  {
    id: 'incarnation',
    label: 'Incarnation',
    description: 'How the fathers understood the Word becoming flesh — two natures, one person, and the hypostatic union.',
    development: 'Ignatius of Antioch insisted against the Docetists that Christ truly suffered in the flesh. Justin and Irenaeus developed the idea of the eternal Word taking on humanity to restore what Adam lost. The question sharpened in the 5th century: Nestorius of Constantinople taught a loose union of two persons, while Cyril of Alexandria defended that Mary could be called Theotokos (God-bearer) because Christ is one divine person. Ephesus (431) sided with Cyril. Then Eutyches went too far the other way, collapsing Christ\'s humanity into his divinity. Chalcedon (451) settled the question: Christ is one person in two complete natures — divine and human — without mixture, confusion, separation, or division.',
    keywords: ['incarnation', 'word became flesh', 'two natures', 'hypostatic', 'god became man', 'took flesh', 'assumed humanity', 'union of natures', 'theotokos', 'mother of god'],
  },
  {
    id: 'eucharist',
    label: 'Eucharist',
    description: 'Patristic teaching on the Lord\'s Supper — real presence, sacrifice, thanksgiving, and the body and blood of Christ.',
    development: 'Ignatius (c. 108) already called the Eucharist "the flesh of our Saviour" and a "medicine of immortality." Justin Martyr described it as the true body and blood and linked it to the Incarnation. By the 4th century, Cyril of Jerusalem\'s Catechetical Lectures gave the fullest early account of eucharistic transformation — the bread and wine truly become the body and blood through the Holy Spirit\'s epiclesis. John Chrysostom emphasised the sacrifice offered on the altar as a re-presentation of Calvary. In the West, Ambrose stressed the words of institution as the moment of change, while Augustine\'s more symbolic language created a lasting tension about the precise nature of Christ\'s presence — a tension that would occupy the medieval and Reformation eras.',
    keywords: ['eucharist', 'lord\'s supper', 'body and blood', 'bread and wine', 'body of christ', 'blood of christ', 'sacrifice', 'altar', 'communion', 'thanksgiving'],
  },
  {
    id: 'baptism',
    label: 'Baptism',
    description: 'The fathers on baptism as regeneration, forgiveness of sins, initiation, and its relation to faith and the Spirit.',
    development: 'From the beginning, baptism was understood as the doorway into the church — not merely a symbol but the actual washing away of sins and rebirth by the Spirit (Titus 3:5). Tertullian described it as a seal against the devil, while Cyprian insisted on rebaptism of heretics (a view Rome rejected). The Donatist controversy in North Africa forced a sharper question: does the minister\'s holiness affect the sacrament? Augustine answered decisively: no — baptism belongs to Christ, not the minister, and it leaves a permanent mark (character) on the soul. Infant baptism, practiced at least from the 3rd century, was debated by Pelagius who denied original sin; Augustine\'s defense of infant baptism became inseparable from his doctrine of original sin and grace.',
    keywords: ['baptism', 'baptize', 'baptized', 'born of water', 'regeneration', 'born again', 'washing', 'remission of sins', 'laver', 'font'],
  },
  {
    id: 'grace',
    label: 'Grace & Free Will',
    description: 'From Pelagius through Augustine and beyond — the relationship between divine grace and human freedom.',
    development: 'The early fathers generally affirmed both God\'s grace and human responsibility without a formal system. The decisive controversy erupted when the British monk Pelagius (c. 400) taught that humans have the natural ability to choose good and obey God without needing divine grace. Augustine of Hippo responded with the most thorough theology of grace in antiquity: fallen humanity cannot choose good without God\'s prior grace, and those who are saved are predestined by God\'s sovereign mercy. The Semi-Pelagian position — that humans take the first step and God responds — emerged in Gaul (Cassian, Faustus of Riez) as a middle way. The Council of Orange (529) largely affirmed Augustine\'s position on prevenient grace while rejecting double predestination. The debate never fully resolved and resurfaced at the Reformation.',
    keywords: ['grace', 'free will', 'predestination', 'election', 'pelagian', 'merit', 'justification', 'works', 'predestined', 'chosen'],
  },
  {
    id: 'scripture',
    label: 'Scripture',
    description: 'Patristic approaches to biblical inspiration, authority, canon, and interpretation (allegory vs. literal).',
    development: 'The earliest fathers quoted the Old Testament as fulfilled prophecy and the apostolic writings as equally authoritative. Clement of Alexandria and Origen developed the allegorical method — arguing that Scripture has multiple senses (literal, moral, spiritual) and that the deeper spiritual meaning is often the real one. The Antiochene school (Diodorus of Tarsus, Theodore of Mopsuestia, Chrysostom) pushed back: Scripture\'s literal-historical sense must be the foundation. Jerome\'s Vulgate (c. 400) gave the West a standard Latin Bible; he controversially preferred the Hebrew Old Testament over the Septuagint. Augustine\'s rules for interpretation in De Doctrina Christiana became the standard Western framework. All fathers agreed the Spirit inspired Scripture and that the church\'s rule of faith governed its interpretation.',
    keywords: ['scripture', 'holy scripture', 'inspired', 'inspiration', 'word of god', 'allegory', 'literal sense', 'typology', 'canon', 'old testament', 'interpretation'],
  },
  {
    id: 'atonement',
    label: 'Atonement',
    description: 'How Christ\'s death saves — ransom, victory over death, satisfaction, moral influence, and deification.',
    development: 'The early fathers did not systematize the atonement but used vivid imagery. Irenaeus spoke of "recapitulation" — Christ retracing and redeeming every step of Adam\'s fall. Origen developed the ransom theory: Christ paid a ransom to the devil to liberate humanity. Athanasius emphasized deification and victory over death — God became human so that humans might become divine, and Christ\'s resurrection broke death\'s power. Chrysostom and others saw the cross as a sacrifice that satisfies divine justice. In the Latin West, Tertullian\'s legal vocabulary (satisfaction, merit) laid groundwork for Anselm\'s later satisfaction theory. Augustine held multiple metaphors together without reducing them to one. The patristic era bequeathed a rich, multi-faceted understanding rather than a single theory.',
    keywords: ['atonement', 'ransom', 'redeemed', 'redemption', 'propitiation', 'sacrifice', 'death of christ', 'cross', 'forgiveness', 'reconciliation', 'victory over death'],
  },
  {
    id: 'resurrection',
    label: 'Resurrection',
    description: 'The bodily resurrection of Christ and its implications for the resurrection of the dead.',
    development: 'Against Gnostic denials, the 2nd-century fathers (Ignatius, Polycarp, Justin, Irenaeus) insisted on the literal, bodily resurrection of both Christ and believers. The body is not a prison to escape but part of God\'s good creation destined for redemption. Tertullian wrote an entire treatise on the resurrection of the flesh. The philosophical challenge was the soul-body relationship: Origen controversially taught a spiritual resurrection body that barely resembled the earthly body — a position later condemned. Gregory of Nyssa and Augustine defended the identity of the resurrected body with the earthly one while acknowledging its glorified transformation. The resurrection was understood not as resuscitation but as transformation to incorruptibility — the first fruits of the new creation.',
    keywords: ['resurrection', 'rose from the dead', 'raised from the dead', 'raised up', 'bodily resurrection', 'immortality', 'incorruption', 'first fruits'],
  },
  {
    id: 'church',
    label: 'Church & Ministry',
    description: 'The nature of the church, apostolic succession, episcopate, and the marks of the true church.',
    development: 'Ignatius of Antioch (c. 108) is the earliest witness to the threefold ministry of bishop, presbyter, and deacon — and to the bishop as the centre of unity. Irenaeus used apostolic succession to argue against the Gnostics: the true faith can be traced in an unbroken line from the apostles through their successors. Cyprian of Carthage gave the episcopal church its classic Latin theology: "outside the church there is no salvation," and the unity of the church is embodied in the unity of the bishops. The Donatist crisis forced Augustine to distinguish between the visible and invisible church and between valid sacraments and sanctifying grace. By the late patristic period, Rome\'s claim to primacy was developing — accepted in the West, contested in the East — setting the stage for later divisions.',
    keywords: ['church', 'bishop', 'apostolic', 'succession', 'presbyter', 'clergy', 'episcopate', 'one holy catholic', 'body of christ', 'bride of christ'],
  },
  {
    id: 'eschatology',
    label: 'Last Things',
    description: 'Patristic teaching on death, judgment, heaven, hell, purgatory, and the end times.',
    development: 'The earliest Christians expected Christ\'s imminent return. When the parousia was delayed, the church developed a more nuanced eschatology. Many Ante-Nicene fathers (Justin, Irenaeus, Tertullian) held a form of millenarianism — a literal thousand-year reign of Christ on earth before the final judgment. Origen allegorized the millennium and rejected a literal earthly kingdom. After Constantine, Eusebius and Augustine reinterpreted Revelation: the millennium is the present age of the church, not a future earthly reign. Augustine\'s City of God gave the West its dominant eschatological framework — history as the conflict between two cities, ending in the final separation at judgment. Purgatory as a place of post-death purification developed gradually, more explicitly in Gregory the Great in the West; the East retained a different, less defined understanding.',
    keywords: ['resurrection of the dead', 'judgment', 'last day', 'eternal life', 'hell', 'paradise', 'kingdom of god', 'purgatory', 'second coming', 'end of the world'],
  },
  {
    id: 'prayer',
    label: 'Prayer & Worship',
    description: 'The fathers on the nature, forms, and practice of Christian prayer and liturgical worship.',
    development: 'The Didache (c. 100) already gives structured instructions for prayer and the Eucharist, showing liturgy forming very early. Tertullian and Origen wrote the first systematic treatises on prayer, emphasising the Lord\'s Prayer as the model and defining true prayer as lifting the mind to God. Cyril of Jerusalem\'s mystagogical catecheses (c. 350) reveal how elaborate and theologically rich the baptismal liturgy had become. John Chrysostom\'s homilies on the Lord\'s Prayer and the nature of prayer shaped Eastern piety. In the desert tradition, Evagrius Ponticus defined prayer as "the laying aside of thoughts" — the beginning of contemplative theology. By Gregory the Great, the Western liturgy had taken its basic shape, and prayer was understood as both vocal liturgy and inner contemplation of God.',
    keywords: ['prayer', 'pray', 'worship', 'liturgy', 'lord\'s prayer', 'our father', 'petition', 'intercession', 'fasting', 'contemplation'],
  },
  {
    id: 'icons',
    label: 'Icon Veneration',
    description: 'The contested development of sacred images in Christian worship — from early prohibition to the theology of icons and the Iconoclast controversy.',
    development: 'The earliest Christians inherited a strong Jewish aversion to images and were accused by pagans of having no statues or temples. Origen, Tertullian, and Clement of Alexandria explicitly condemned the veneration of any image as idolatry. The Council of Elvira (c. 306) went so far as to prohibit pictures in churches entirely. Even after Constantine, the resistance continued: Eusebius of Caesarea flatly refused a request from Constantine\'s sister for a painted image of Christ, insisting the divine nature could not be depicted. Epiphanius of Salamis (d. 403) reportedly tore down a curtain bearing a human figure in a church, citing it as a violation of Christian practice.\n\nA shift began in the 5th and 6th centuries as images spread in churches for didactic purposes — teaching the gospel to the illiterate. Pope Gregory the Great (d. 604) gave the clearest articulation of this position: images are "the books of the unlearned" and should not be destroyed, yet neither should they be worshipped. This uneasy middle ground did not hold.\n\nThe Iconoclast controversy erupted in 726 when Emperor Leo III ordered the destruction of the famous icon of Christ above the Chalke Gate in Constantinople. The decisive theological defence came from John of Damascus (d. 749), writing safely from Muslim-controlled territory beyond imperial reach. John argued that the Incarnation itself changes everything: since God took on visible, material flesh in Christ, depicting that flesh is not idolatry but an affirmation of the Incarnation. He drew the crucial distinction between latria — the absolute worship due to God alone — and proskynesis, the relative veneration given to icons, which passes through the image to the person depicted.\n\nThe Second Council of Nicaea (787) vindicated John\'s position: the veneration of icons was declared orthodox, and their destruction heresy. A second wave of iconoclasm (815–842) was finally ended on the first Sunday of Lent, 843 — still celebrated in the Eastern Church as the "Triumph of Orthodoxy."',
    keywords: ['image', 'images', 'idol', 'idolatry', 'picture', 'statue', 'likeness', 'icon', 'painted', 'worship of images', 'representations', 'graven'],
  },
  {
    id: 'deification',
    label: 'Deification (Theosis)',
    description: 'The Eastern patristic teaching on participation in the divine nature — becoming by grace what God is by nature.',
    development: 'Irenaeus first articulated the exchange at the heart of salvation: "God became man so that man might become god." This was not pantheism but participation — humanity sharing in the divine life through grace. Athanasius made it central to his soteriology: the Word became flesh so that we might be "deified." The Cappadocians developed it through the distinction between God\'s unknowable essence and his communicable energies — humans can participate in God\'s life without merging with his being. Maximus the Confessor (7th century) gave theosis its most sophisticated form, integrating Christology and anthropology: the Incarnation enables the full deification of humanity. In the West, Augustine spoke of participation in God but the concept never had quite the same centrality; by the medieval period it was more prominent in Eastern theology and mysticism.',
    keywords: ['deification', 'theosis', 'divinization', 'divine nature', 'partakers of', 'god became man that man', 'union with god', 'likeness of god', 'image of god', 'participation'],
  },
]
