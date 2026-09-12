/**
 * Thomistic metaphysics primer for the Aquinas tab (Metaphysics/Philosophy mode).
 * Hand-written. Scripture refs in the text ("Exodus 3:14") are auto-linked by
 * the panel; keep them in canonical book-name form from books.ts.
 */
export interface PhilosophySection {
  id: string
  title: string
  summary: string      // one line under the title in the list
  paragraphs: string[] // body, in order
  scripture: string[]  // "Ref — why it matters" pointers shown at the end
}

export const AQUINAS_PHILOSOPHY: PhilosophySection[] = [
  {
    id: 'who',
    title: 'Who is Aquinas?',
    summary: 'The Church’s greatest metaphysician, and why that matters for reading Scripture',
    paragraphs: [
      'Thomas Aquinas (1225–1274) was a Dominican friar, priest and teacher at Paris and Naples. He wrote the Summa Theologica, the Summa Contra Gentiles, commentaries on most of Scripture and on Aristotle, and compiled the Catena Aurea. The Church names him the Angelic Doctor and the Common Doctor, and he is widely regarded as her greatest metaphysician — the thinker who gave the faith its most complete account of what being itself is.',
      'His project was simple to state: everything that exists points back to God, and the mind can trace that pointing. Faith and reason are two lights from one source, so they cannot finally contradict. Where Augustine reasoned mainly from the soul inward, Thomas reasoned from the world outward — from motion, causes, natures and ends up to the One who is Being itself.',
      'His tools were Aristotle’s, corrected and completed by Scripture. Aristotle knew act and potency, form and matter, the four causes. He did not know creation from nothing, nor a God whose very essence is to exist. Thomas took the Greek instruments and used them to say what Exodus 3:14 says: God is I AM.',
      'Near the end of his life, after a vision at Mass, he stopped writing: “All that I have written seems like straw compared to what I have seen.” The metaphysics that follows is that straw — but it is straw that keeps the mind honest about God, creation and the soul, and it is the grammar behind most of the Church’s doctrinal language.',
    ],
    scripture: [
      'Exodus 3:14 — “I AM THAT I AM”: the verse Thomas took as the metaphysical name of God',
      'Romans 1:20 — the invisible things of God are understood from the things that are made: the charter for natural theology',
      'Wisdom of Solomon 13:1-5 — from the greatness and beauty of creatures the Maker is seen by analogy',
    ],
  },
  {
    id: 'first-principles',
    title: 'First Principles',
    summary: 'The self-evident truths every argument stands on, and the analogy of being',
    paragraphs: [
      'A first principle is a truth you cannot prove because every proof already uses it. You do not learn it; you notice you have always known it. Thomism rests on a handful of these.',
      'Non-contradiction: a thing cannot both be and not be, in the same respect, at the same time. Analogy: a door can be open or shut, but not both at once; anyone who says otherwise is either speaking of two doors or two moments. Every sentence you have ever understood depended on this.',
      'Identity: each thing is what it is. A being has a definite nature, not a blur. This is why we can name things at all, and why Adam’s naming of the animals in Genesis 2:19-20 is an act of knowledge, not invention.',
      'Excluded middle: between being and non-being there is no third option. A thing either exists or it does not; a claim is either true or false. Analogy: a light switch has no position that is neither on nor off.',
      'Sufficient reason and causality: whatever exists has an adequate reason for existing, either in itself or in another. What comes to be has a cause. Analogy: a ball rolling across the floor makes you look for who kicked it; no one accepts “it just did” as an explanation. Aquinas will build the Five Ways entirely on this instinct.',
      'Finality: every agent acts for an end. Fire heats, seeds grow, eyes see — not by accident but by tendency. Analogy: an arrow flies to the target because an archer aimed it; nature’s regularity is the arrow, and it points to an Archer (see the Fifth Way).',
      'The analogy of being belongs here because it governs how the word “is” works in all the rest. “Is” is not said in exactly the same sense (univocally) of God, a man, a colour and a number, nor in wholly different senses (equivocally), but analogically: related senses ordered to one primary sense. Analogy: “healthy” is said of a man, of his food, and of his complexion — differently, yet all in relation to the one health of the body. So “being” is said first of God, who is Being, and of everything else in relation to Him. This is why we can speak truly of God from creatures (Romans 1:20) without pretending our words fit Him the way they fit us (Isaiah 55:8-9).',
    ],
    scripture: [
      'Genesis 2:19-20 — naming the animals: things have definite natures the mind can grasp',
      'Isaiah 55:8-9 — God’s ways are not our ways: language about God is analogical, not univocal',
      '2 Timothy 2:13 — God cannot deny Himself: non-contradiction holds even for God',
      'Hebrews 6:18 — it is impossible for God to lie: the same principle, stated morally',
    ],
  },
  {
    id: 'act-potency',
    title: 'Act and Potency',
    summary: 'The distinction that makes change intelligible and leads straight to God',
    paragraphs: [
      'The Greek philosopher Parmenides argued that change is impossible: a thing cannot come from being (it already is) nor from non-being (nothing comes from nothing). Aristotle’s answer was to split “being” in two. A thing can be something in act — actually, right now — or in potency — really able to become it, though not yet.',
      'An acorn is not an oak, but it is not nothing either: it is an oak in potency. Cold water is hot in potency. A sleeping man is a thinking man in potency. Change is the passing from potency to act, and it only makes sense because potency is a real feature of things, a genuine “can be” rooted in what they are.',
      'One rule follows and carries enormous weight: nothing passes from potency to act except by something already in act. Cold water does not heat itself; fire, already hot, heats it. The acorn does not grow by itself; sun, soil and water, already actual, draw it out. Whatever is being changed is being changed by another.',
      'Now ask what is at the top. Everything we meet is a mixture of act and potency — partly what it is, partly what it could be. Follow the chain of things-actualised-by-others and it cannot go on forever, because a chain of borrowed actuality with no source has nothing to lend. There must be something that is pure act: fully what it is, with no unrealised potency, needing nothing to actualise it. That is what Christians call God.',
      'This is why Scripture insists God does not change (Malachi 3:6, James 1:17). Not because He is frozen, but because there is nothing in Him still waiting to happen. Creatures become; God simply is. Exodus 3:14 in metaphysical dress: I AM — not I am becoming.',
    ],
    scripture: [
      'Malachi 3:6 — “I the LORD change not”: God has no potency to be actualised',
      'James 1:17 — no variableness nor shadow of turning: pure act',
      'Exodus 3:14 — I AM: being in act without remainder',
      'Acts 17:28 — in Him we live and move and have our being: every creaturely act is drawn from His',
    ],
  },
  {
    id: 'hylomorphism',
    title: 'Hylomorphism: Form and Matter',
    summary: 'Why every bodily thing is a union of what-it-is-made-of and what-makes-it-this',
    paragraphs: [
      'Hylomorphism (Greek hyle, matter; morphe, form) says every physical thing is composed of two principles: matter, the stuff that can be shaped, and form, the shaping that makes it this kind of thing. Neither exists on its own. You never meet bare matter, nor a form floating free; you meet a bronze statue, a living dog, a burning log.',
      'Analogy: a wax seal. The wax is matter; the impression of the king’s ring is form. Same wax, different ring, different seal. Melt it and the form is gone, though no wax was lost. Form is not an extra ingredient added to matter; it is the way the matter is actually organised, the answer to “what is it?”',
      'Why is this needed? Because two facts have to be held together. First, things really change into other things: bread becomes flesh, a log becomes ash, a seed becomes a tree. That requires something underlying that persists — matter. Second, things really are what they are: a dog is not a random heap of the same atoms as a cat. That requires a principle of unity and identity — form. Drop matter and change becomes annihilation-and-replacement; drop form and everything is one grey soup.',
      'Form and matter are the act-and-potency pair applied to bodies. Matter is potency: it can be many things. Form is act: it makes the matter be this one thing now. Genesis 1:2 shows the earth “without form, and void”, and the six days are God speaking form into it — light, firmament, land, living kinds. The Word by whom all things were made (John 1:3) is the source of every form.',
      'One consequence matters later: a form that organises matter into a living thing is called a soul. That is not a ghost in a machine; it is what makes this matter be a living body at all.',
    ],
    scripture: [
      'Genesis 1:2 — without form and void: matter awaiting form, then formed by the Word',
      'Genesis 2:7 — dust of the ground and breath of life: matter and form in man',
      'Jeremiah 18:6 — the potter and the clay: the same matter receiving different forms',
      'Romans 9:21 — one lump, vessels to honour and dishonour: matter is potency to many forms',
    ],
  },
  {
    id: 'four-causes',
    title: 'The Four Causes',
    summary: 'The four questions that fully explain any thing',
    paragraphs: [
      'To explain a thing completely you must answer four questions, and Aristotle called each answer a “cause”. Take a bronze statue of a king. What is it made of? Bronze — the material cause. What makes it this rather than that? The shape of a king — the formal cause. Who brought it about? The sculptor — the efficient cause. What is it for? To honour the king — the final cause.',
      'Modern science mostly keeps only the third, and shrinks it to “what pushed what”. Aquinas keeps all four, and treats the final cause as the cause of causes: the sculptor only picks up the chisel because he intends the statue. Remove the end and the efficient cause has no reason to act. This is why the Fifth Way starts from ends.',
      'Applied to creation: God is not the material cause of the world (the world is not made of God — that is pantheism). He is its efficient cause, making it from nothing (Hebrews 11:3). He is its exemplar or formal cause, since every creature is a likeness of an idea in the divine mind (John 1:3-4, Colossians 1:16). And He is its final cause: all things are made for Him (Colossians 1:16, Romans 11:36).',
      'Applied to a human act: matter is the bodily deed, form is the intention that makes it this kind of act, the efficient cause is the free will, the end is the good aimed at. Moral theology is built on this: the same outward deed can be a different act because its form (intention) and end differ. Compare 1 Samuel 16:7.',
      'Scripture reasons with all four causes without naming them. The parable of the sower (Matthew 13:3-23) is about material cause: the same seed, different soils. The vineyard planted for fruit (Isaiah 5:1-7) is final causality. The potter (Jeremiah 18) is efficient and formal cause together.',
    ],
    scripture: [
      'Hebrews 11:3 — the worlds framed by the word of God, not from things which appear: efficient cause from nothing',
      'Colossians 1:16 — all things created by Him and for Him: efficient and final cause in one verse',
      'Romans 11:36 — of Him, through Him, to Him: origin, agency and end',
      'Isaiah 5:1-7 — the vineyard planted for fruit: the final cause judges the thing',
    ],
  },
  {
    id: 'essence-existence',
    title: 'Essence and Existence',
    summary: 'Thomas’s deepest idea: in every creature what-it-is differs from that-it-is; in God alone they are one',
    paragraphs: [
      'Ask two questions of anything: what is it? and is it? The first asks for its essence — the nature that makes it the kind of thing it is. The second asks about its existence — the act by which it actually is, rather than merely being thinkable. You can know perfectly what a phoenix is and still not know whether there is one. So in creatures essence and existence are really distinct.',
      'Analogy: a blueprint and a built house. The blueprint tells you everything about what the house is; it does not put a single brick on the ground. Existence is the building, not another line on the plan. Or: a word and its being spoken. The meaning is complete in the dictionary; it takes a speaker to give it breath.',
      'This is Aquinas’s own contribution beyond Aristotle. He saw that essence stands to existence as potency to act: a nature is a capacity to be, and existence is the act that fills it. Which means every creature is composed, dependent and receiving. Its existence is not part of what it is; it is given. Nothing in a lion’s definition says “and it must exist”. So its existing must come from outside — from something whose existence is not given but owned.',
      'That something must be a being whose essence simply is to exist — in whom the answer to “what is it?” is “It is.” Aquinas calls God ipsum esse subsistens: subsistent Being itself. Not a being among beings, however great, but Being, in which all beings share. This is what he heard in Exodus 3:14. God did not give Moses a name like the pagan gods had; He gave the one name that is not a nature at all but pure existence: I AM.',
      'Everything follows. God is one, because there cannot be two “just existings” with nothing to distinguish them. God is simple, because there is no composition of what and that in Him. God is infinite, because essence limits existence the way a cup limits water, and in Him there is no cup. God is present in everything, because existence is the innermost thing in each creature, and He is giving it now (Acts 17:28, Hebrews 1:3). Creation is not an event long ago; it is the continuous gift of existence to essences that cannot supply it themselves.',
    ],
    scripture: [
      'Exodus 3:14 — I AM THAT I AM: essence identical with existence',
      'John 8:58 — before Abraham was, I AM: Christ claims the same name',
      'Acts 17:28 — in Him we live and move and have our being: creatures hold existence on loan',
      'Hebrews 1:3 — upholding all things by the word of His power: existence continuously given',
      'Revelation 1:8 — which is, and which was, and which is to come: being without beginning or dependence',
    ],
  },
  {
    id: 'participation',
    title: 'Participation',
    summary: 'How many things can share in what one thing simply is',
    paragraphs: [
      'If God alone is Being by essence, how does anything else exist? By participation: creatures have existence, God is existence. To participate is to have partially what another has fully and by nature. Analogy: the sun is light; the moon, the sea and a window are lit. They truly shine, yet none of them is the source, and none would shine if the sun withdrew.',
      'Or: heat. Fire is hot by nature; the iron in the fire is hot by participation — really hot, but only as long as it stays in the fire. Pull it out and it cools. So with existence: a creature exists really and truly, but only as long as it is held in Being. It never becomes self-sustaining.',
      'Participation also explains the ladder of creatures. A stone participates in being; a plant participates in being and life; an animal in being, life and sensation; a man in being, life, sensation and mind; an angel more fully still. Each higher grade shares more of what God is fully and simply. This is why the Psalms can summon all creatures to praise (Psalms 148:1-13): each one, by existing, is already saying something of God.',
      'The analogy of being from First Principles is the language of participation. Because creatures share in what God is, our words drawn from creatures (good, wise, alive) apply to God truly — not identically, but as the lit thing speaks of the light. And because they only share, no creature exhausts Him: He is always more.',
      'Grace is participation raised to its height. 2 Peter 1:4 says the baptised become “partakers of the divine nature”. Nature participates in God’s being; grace participates in His life. Same structure, higher gift. The Fathers called it deification; Aquinas gives it its metaphysics.',
    ],
    scripture: [
      'Acts 17:28 — in Him we live and move and have our being: participation stated by Paul',
      '2 Peter 1:4 — partakers of the divine nature: participation raised by grace',
      'John 1:9 — the true Light which lighteth every man: one source, many lit',
      'Psalms 148:1-13 — all creatures praise Him: each shares in and points to its source',
      '1 Corinthians 4:7 — what hast thou that thou didst not receive? Everything a creature has is participated',
    ],
  },
  {
    id: 'five-ways',
    title: 'The Five Ways',
    summary: 'Five roads from what we see to the One who must be',
    paragraphs: [
      'The Five Ways (Summa Theologica I, Q2, A3) are not five proofs from nothing; each starts from a plain feature of the world and follows one first principle to its source. None pictures a first domino at the start of time. Each is about a chain of dependence right now: what is holding this up, and what holds that up?',
      'First Way, from motion: things change, passing from potency to act. Whatever is changed is changed by another already in act. A chain of movers each moved by another has no motion of its own unless something at the base moves without being moved. There must be an Unmoved Mover.',
      'Second Way, from efficient causes: nothing causes itself, since it would have to exist before it exists. Causes that only cause because something else causes them cannot go on without end. There must be a first cause, uncaused. Analogy: a train of carriages moves only if there is an engine; add a thousand carriages and you have not explained the motion, you have made an engine more necessary.',
      'Third Way, from contingency: everything around us can not-be; it came to be and will pass away. If everything were like that, then given endless time there would have been a moment with nothing — and from nothing, nothing comes. So something must exist necessarily, of itself. That is God, who is (Exodus 3:14), while all else might not have been.',
      'Fourth Way, from degrees: we call things more or less good, true, noble. “More” and “less” only make sense against a maximum, as things are called hotter by nearness to fire. Whatever is the fullest of being and goodness is the cause of being and goodness in the rest. This is participation turned into an argument.',
      'Fifth Way, from governance: things without minds act for ends — seeds grow into trees, eyes see, the seasons return. Things without knowledge cannot aim unless aimed, as an arrow does not direct itself. So an intelligence directs all natural things to their ends. Jesus points to exactly this in Matthew 6:26-30: the birds fed and the lilies clothed by a Father who orders them.',
      'Aquinas held that reason can reach this far unaided, which is why Romans 1:20 says the pagans are without excuse. But note what the Ways do not deliver: not the Trinity, not the Incarnation, not that God loves you. Reason reaches the God of the philosophers; only revelation shows His face.',
    ],
    scripture: [
      'Romans 1:20 — the invisible things clearly seen from the things made: the warrant for all five',
      'Wisdom of Solomon 13:1-9 — from the works the Workman is known; ignorance is inexcusable',
      'Psalms 19:1 — the heavens declare the glory of God: the world as evidence',
      'Matthew 6:26-30 — birds and lilies: the Fifth Way in the words of Christ',
      'Exodus 3:14 — the necessary Being the Third Way arrives at',
    ],
  },
  {
    id: 'transcendentals',
    title: 'The Transcendentals',
    summary: 'Being, one, true, good, beautiful — five names for the same thing',
    paragraphs: [
      'Some properties belong to a thing because of what kind it is: only bodies are heavy, only animals see. But some belong to a thing simply because it is. These “climb across” (transcend) every category, and so are called transcendentals. Every being, just by being, is one, true and good; and, on the common reading, beautiful.',
      'One: whatever is, is undivided in itself. A pile of stones is many; a stone is one. A living body is one in a stronger way than a heap. Unity is not something added to being; it is being seen as undivided. Hence Deuteronomy 6:4 — the LORD is one — says of God what is said of every being, but supremely, because He is utterly simple.',
      'True: whatever is, is intelligible — it can be known, it matches a mind. Things are true first in relation to God’s mind, which made them, and then to ours, which learns from them. Analogy: a coin is “true” when it matches the die that struck it. Creatures are true because they match the Word by whom they were made (John 1:3); our judgments are true when they match creatures. This is why truth is not invented but found, and why Christ can say “I am the truth” (John 14:6).',
      'Good: whatever is, is desirable insofar as it is. Being is what everything wants; evil is not a thing but a lack, a hole in being, as blindness is not a thing but a missing sight. Genesis 1:31 — God saw everything He had made, and it was very good — is a metaphysical claim: to be is to be good. Evil has no maker.',
      'Beautiful: what pleases when seen, through integrity, proportion and clarity. Beauty is goodness as it strikes the mind through the senses. The transcendentals are convertible: one, true, good and beautiful are not four things in a being but the one being regarded from four sides. That is why the pursuit of any of them, honestly followed, leads to the others and finally to God, who is Being, and so is One, Truth, Goodness and Beauty itself.',
    ],
    scripture: [
      'Genesis 1:31 — everything very good: being as such is good',
      'Deuteronomy 6:4 — the LORD is one: unity as the mark of being',
      'John 14:6 — I am the truth: truth is a person before it is a proposition',
      'Wisdom of Solomon 11:20 — ordered in measure, number and weight: the proportion that makes creation beautiful',
      'Psalms 27:4 — to behold the beauty of the LORD: beauty as an attribute of God',
      '1 John 4:8 — God is love: goodness diffusing itself',
    ],
  },
  {
    id: 'natural-law',
    title: 'Natural Law',
    summary: 'Morality as the human share in God’s ordering of all things',
    paragraphs: [
      'Aquinas defines law as an ordering of reason, for the common good, by one who has care of the community, made known. God’s ordering of the whole universe to its end is the eternal law. A stone obeys it by falling, a plant by growing, an animal by instinct. Man obeys it by knowing it: the natural law is the rational creature’s participation in the eternal law. We alone are ruled by a law we can read.',
      'Its first principle is as self-evident as non-contradiction: good is to be done and pursued, and evil avoided. From it, reason reads off what is good for a being like us from what we are. We are living, so life is to be preserved. We are animals, so union of man and woman and the raising of children is good. We are rational, so truth is to be known, God is to be sought, and society is to be lived in without injury. These are not commands imposed from outside; they are the shape of human nature seen from inside.',
      'Analogy: the manual that comes with a machine is not an arbitrary list of rules; it describes how the thing is built and therefore how it runs well and how it breaks. Natural law is the manual written into the nature itself. Paul says exactly this in Romans 2:14-15: the Gentiles, having no written Law, do by nature the things of the Law, showing its work written in their hearts.',
      'Human law is valid only insofar as it draws on natural law; a law against nature is not law but violence, and Peter’s “we ought to obey God rather than men” (Acts 5:29) is the natural law overruling the state. Divine law — the Old and New Law revealed in Scripture — adds what reason cannot reach and repairs what sin has clouded (Romans 7:22-23), but it does not contradict nature, because the same God authored both.',
      'This is why the Ten Commandments are, for Aquinas, mostly natural law written down (Exodus 20:1-17): a people freed from Egypt needed to hear plainly what their hearts already half knew. And why Jeremiah 31:33 promises the law written on the heart as the fulfilment, not the abolition, of law.',
    ],
    scripture: [
      'Romans 2:14-15 — the law written in their hearts: natural law stated by Paul',
      'Psalms 19:7-11 — the law of the LORD is perfect, converting the soul: law as ordering to the good',
      'Acts 5:29 — obey God rather than men: unjust law is no law',
      'Jeremiah 31:33 — the law in their inward parts: grace perfecting nature',
      'Romans 7:22-23 — the law of the mind and the law in the members: nature wounded but not erased',
    ],
  },
  {
    id: 'substance-accidents',
    title: 'Substance, Accidents and Substantial Form',
    summary: 'The bridge to the soul: what makes a thing this thing rather than merely this way',
    paragraphs: [
      'Before the soul can be understood, one more distinction is needed. Some features of a thing can change while the thing remains: a man tans, learns Greek, grows old, sits down. These are accidents — not “accidental” in the sense of unplanned, but in the sense of belonging to a thing without being what it is. What remains through all of them, and carries them, is the substance: the man himself.',
      'Analogy: a river and its surface. Ripples, colour, temperature and level come and go; the river is what has them. Or a musician and his tunes: he can play many, and is the same musician throughout. Accidents exist in a substance; a substance exists in itself. Redness is always the redness of something. A horse is not the horse of anything.',
      'Now put form and matter back in. There are two kinds of form. An accidental form makes a substance be a certain way — a bronze made round, a man made tanned. A substantial form makes matter be a certain substance at all — makes this stuff be bronze, or be a horse. Take away an accidental form and you have the same thing, changed. Take away the substantial form and you no longer have that thing; you have something else (a corpse, ash, a puddle).',
      'Each substance has exactly one substantial form. A man is not a body plus an animal plus a mind stacked together; one form makes this matter be, at once, a body, alive, sensing and rational. That single form is what Aquinas means by the soul. This is the point most people miss: for Thomas the soul is not a substance living inside a body. It is the form that makes the body a human body, as the seal’s impression makes the wax a seal.',
      'The Church leaned on this distinction at the deepest moment of her sacramental teaching. In the Eucharist the accidents of bread — taste, weight, colour — remain, while the substance becomes the Body of Christ (Matthew 26:26). Only a metaphysics that distinguishes substance from accident can even state what is being claimed. And 1 Samuel 16:7 hints at the same grammar: man looks on the outward appearance, the LORD looks on the heart.',
    ],
    scripture: [
      '1 Samuel 16:7 — outward appearance versus the heart: accidents versus substance',
      'Matthew 26:26 — this is My body: substance changed, accidents remaining',
      '2 Corinthians 4:16 — the outward man perishes, the inward is renewed: accidents change, the person persists',
      'Psalms 102:26-27 — they shall be changed, but Thou art the same: creatures alter, God alone has no accidents',
    ],
  },
  {
    id: 'soul',
    title: 'The Soul as Substantial Form of the Body, and its Immortality',
    summary: 'Why the soul is neither a ghost nor a by-product, and why it cannot die',
    paragraphs: [
      'Put the pieces together. A living body is matter organised by a substantial form; that form is the soul. Plants have a soul that gives life, growth and reproduction. Animals have a soul that adds sensation and movement. Man has a soul that adds intellect and will. It is one soul doing all of it: the same form by which I digest, see and think. Genesis 2:7 gives the picture exactly: dust of the ground, and the breath of life, and the result is not two things but one living man.',
      'This rules out two errors at once. Against Plato and Descartes, the soul is not a spirit imprisoned in or piloting a body; the body is not a tool the soul uses but the soul’s own expression in matter. I do not have a body; I am a besouled body. Against the materialist, the soul is not a side-effect of the brain, because the form is what makes the brain a living human brain in the first place, not something the brain produces.',
      'Why then does the human soul survive death, when a dog’s does not? Because of what it does. The intellect grasps universals — not this triangle but triangularity, not this good deed but goodness, not this being but being as such. No bodily organ can do that, since every organ is particular: the eye sees this colour here, never colour itself. An activity that does not use a bodily organ belongs to a power that does not depend on the body to exist. And what does not depend on the body to exist does not cease when the body does. The rational soul is subsistent: a form that has its own existence, and gives it to the body, rather than receiving it from the body.',
      'Analogy: a song and a singer. When the singer stops, the song is gone — that is the animal soul, which is nothing but the form of that living matter. But a mind is more like the composer than the song: the composer has the music in himself even when no one is singing. Death is the singer falling silent, not the composer dying. Jesus says as much: fear not those who kill the body but cannot kill the soul (Matthew 10:28).',
      'Yet Aquinas refuses to let the separated soul be the whole story, and here philosophy hands over to Scripture. A soul without its body is a form without its matter — a real person, alive and conscious before God (Luke 23:43, Philippians 1:23, Revelation 6:9), but incomplete, as a hand cut off is still a hand only by courtesy. The soul’s natural orientation to its body is the metaphysical reason the resurrection is fitting and not an afterthought. Paul argues that if the dead rise not, faith is vain (1 Corinthians 15:12-19), and Thomas explains why: man is not a soul, but a soul-and-body, and God does not leave His work half-restored. The immortality of the soul is reason’s conclusion; the resurrection of the body is revelation’s promise; together they say that the whole man is saved.',
    ],
    scripture: [
      'Genesis 2:7 — dust and breath, one living soul: hylomorphism in the creation of man',
      'Matthew 10:28 — they cannot kill the soul: the subsistence of the rational soul',
      'Ecclesiastes 12:7 — dust returns to earth, spirit to God: form and matter part at death',
      'Luke 23:43 — today with Me in paradise: the separated soul is alive and aware',
      'Revelation 6:9 — souls under the altar: persons persisting without their bodies',
      'Mark 12:26-27 — God of Abraham, not of the dead: the patriarchs live',
      '1 Corinthians 15:12-19 — if the dead rise not: the soul is made for its body',
    ],
  },
  {
    id: 'conclusion',
    title: 'Conclusion',
    summary: 'The whole in one breath, and why it is worth carrying',
    paragraphs: [
      'Step back and the twelve sections are one line of thought. Reason begins from truths it cannot deny (first principles). It notices that things change, and that change needs a distinction between what a thing is and what it can become (act and potency). It sees that bodily things are matter shaped by form (hylomorphism), that explaining anything means naming what it is made of, what makes it this, what brought it about and what it is for (the four causes), and that in everything we meet, what it is and that it is come apart (essence and existence).',
      'From there the climb is short. Things that receive existence must receive it from what simply is (participation), and the world’s motion, causes, contingency, degrees and order all point the same way (the Five Ways) — to a God who is pure act, Being itself, one, true, good and beautiful without limit (the transcendentals). Because we are rational sharers in His order we can read His law in our own nature (natural law). And because the form that makes us human does something no organ can do, it does not die with the body, though it is made for the body and waits for it (substance and the soul).',
      'Why carry all this? First, because it keeps faith from becoming vague. “God is love”, “I AM”, “in Him we live and move”, “this is My body”, “fear not them that kill the body” — each of these is a precise claim, and these categories are what let you say exactly what it claims and what it rules out. Most heresies were metaphysical mistakes before they were theological ones.',
      'Second, because it makes Scripture bigger, not smaller. Once you can see act and potency in Malachi 3:6, participation in Acts 17:28, final causality in Matthew 6:26-30, or form and matter in Genesis 2:7, the text stops being a collection of sayings and starts reading as a single description of one reality — the same reality the mind can trace on its own from a falling stone or a growing seed.',
      'Third, because it is how the Church has actually thought. Councils, catechisms and creeds speak this language: substance, nature, person, form, act. Learn the grammar and you can read the family documents. Refuse it and you are left trusting summaries.',
      'Aquinas would add a last thing, and it is the thing he saw at the end: all of this is straw next to the vision of God. Metaphysics does not replace prayer or the sacraments; it clears the ground so that what is loved is the real God and not a picture. Reason walks to the edge of what can be known and hands you to faith — not as a stranger, but as the same Light you have been following all along (John 1:9).',
    ],
    scripture: [
      'John 1:9 — the true Light which lighteth every man: reason and revelation from one source',
      'Romans 1:20 — without excuse: what reason can reach, it is bound to reach',
      '1 Peter 3:15 — be ready always to give a reason for the hope that is in you',
      '1 Corinthians 13:12 — now through a glass darkly, then face to face: where metaphysics ends and vision begins',
    ],
  },
]
