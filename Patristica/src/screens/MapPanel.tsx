import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { JOURNEYS, FATHER_CITIES } from '../data/mapData'
import type { FatherCityEntry, FatherCity } from '../data/mapData'
import { FATHER_LETTERS, CORRESPONDENCE_EXTRA_COORDS } from '../data/correspondenceData'
import type { FatherLetter } from '../data/correspondenceData'
import { getJourneyForPassage } from '../data/mapContext'
import { TRADITION_COLORS } from '../data/traditionColors'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { SelectedVerse } from '../types'

interface Props {
  selected: SelectedVerse | null
  onNavigateToFather?: (name: string) => void
}

interface CityInfo {
  name: string
  description: string
}

const LEGEND_ITEMS = Object.entries(TRADITION_COLORS).map(([label, color]) => ({ label, color }))

// Hoisted once — never changes, avoids per-call JSON.stringify and flatMap
const TRADITION_COLORS_JSON = JSON.stringify(TRADITION_COLORS)
const JOURNEYS_JSON = JSON.stringify(JOURNEYS)
const FATHER_CITIES_JSON = JSON.stringify(FATHER_CITIES)
const ALL_FATHERS = FATHER_CITIES.flatMap(c => c.fathers)

// Build city coords lookup from FATHER_CITIES + any extra correspondence cities
const _cityCoords = new Map<string, { lat: number; lng: number }>()
for (const city of FATHER_CITIES) _cityCoords.set(city.displayName, { lat: city.lat, lng: city.lng })
for (const [name, coords] of Object.entries(CORRESPONDENCE_EXTRA_COORDS)) _cityCoords.set(name, coords)

// Resolve letters to include lat/lng; drop any with unknown cities
interface ResolvedLetter extends FatherLetter {
  fromLat: number; fromLng: number; toLat: number; toLng: number
}
const RESOLVED_LETTERS: ResolvedLetter[] = FATHER_LETTERS.flatMap(letter => {
  const from = _cityCoords.get(letter.fromCity)
  const to   = _cityCoords.get(letter.toCity)
  if (!from || !to) return []
  return [{ ...letter, fromLat: from.lat, fromLng: from.lng, toLat: to.lat, toLng: to.lng }]
})
const RESOLVED_LETTERS_JSON = JSON.stringify(RESOLVED_LETTERS)

// Hoisted stable derivations — these never change after module load
const LETTER_TRADITIONS = [...new Set(FATHER_LETTERS.map(l => l.tradition))].sort()
const SORTED_CITIES = [...FATHER_CITIES].sort((a, b) => a.displayName.localeCompare(b.displayName))

const GROUPS = [
  { label: 'Old Testament',   ids: ['abraham', 'exodus', 'exile'] },
  { label: 'New Testament',   ids: ['jesus-ministry', 'seven-churches', 'jonah', 'flight-egypt'] },
  { label: "Paul's Journeys", ids: ['paul-1', 'paul-2', 'paul-3', 'paul-4'] },
]

function buildMapHtml(isDark: boolean): string {
  const journeysJson = JOURNEYS_JSON
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const bodyBg      = isDark ? '#0d1117' : '#f0ebe2'
  const popupBg     = isDark ? '#1a2030' : '#f5f0e8'
  const popupBorder = isDark ? '#2d3748' : '#d4cfc6'
  const popupTitle  = isDark ? '#f8f4e8' : '#2a2218'
  const popupMuted  = isDark ? '#94a3b8' : '#5a5040'
  const popupTip    = popupBg
  const zoomBg      = isDark ? '#1a2030' : '#f5f0e8'
  const zoomColor   = isDark ? '#e2e8f0' : '#2a2218'
  const zoomBorder  = isDark ? '#2d3748' : '#d4cfc6'
  const zoomHover   = isDark ? '#243040' : '#ede8de'
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:${bodyBg};overflow:hidden}
#map{width:100%;height:100%}
.leaflet-popup-content-wrapper{background:${popupBg};border:1px solid ${popupBorder};border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.3)}
.leaflet-popup-content{margin:10px 13px;font-size:13px;line-height:1.5}
.leaflet-popup-content strong{display:block;color:${popupTitle};font-size:14px;margin-bottom:4px}
.leaflet-popup-content p{color:${popupMuted};font-size:12px;margin:0}
.leaflet-popup-tip-container .leaflet-popup-tip{background:${popupTip}}
.leaflet-popup-close-button{color:${popupMuted}!important;font-size:16px!important;padding:6px 8px!important}
.leaflet-control-zoom a{background:${zoomBg}!important;color:${zoomColor}!important;border-color:${zoomBorder}!important}
.leaflet-control-zoom a:hover{background:${zoomHover}!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var JOURNEYS=${journeysJson};
var map,layerGroup;

map=L.map('map',{center:[30,36],zoom:5,zoomControl:false});
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('${tileUrl}',{
  attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19
}).addTo(map);
layerGroup=L.layerGroup().addTo(map);

window._selectJourney=function(id){
  layerGroup.clearLayers();
  var j=JOURNEYS.find(function(x){return x.id===id});
  if(!j)return;

  var icon=L.divIcon({
    html:'<div style="width:11px;height:11px;border-radius:50%;background:'+j.color+';border:2px solid #fff;box-shadow:0 1px 5px rgba(0,0,0,0.8)"></div>',
    className:'',iconSize:[11,11],iconAnchor:[5,5]
  });

  L.polyline(j.route,{color:j.color,weight:2.5,opacity:0.85}).addTo(layerGroup);

  for(var i=0;i<j.route.length-1;i++){
    var a=j.route[i],b=j.route[i+1];
    var seg=Math.sqrt(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2));
    if(seg<0.3)continue;
    var mLat=(a[0]+b[0])/2,mLng=(a[1]+b[1])/2;
    var dLng=(b[1]-a[1])*Math.PI/180;
    var lat1R=a[0]*Math.PI/180,lat2R=b[0]*Math.PI/180;
    var y=Math.sin(dLng)*Math.cos(lat2R);
    var x=Math.cos(lat1R)*Math.sin(lat2R)-Math.sin(lat1R)*Math.cos(lat2R)*Math.cos(dLng);
    var bearing=Math.atan2(y,x)*180/Math.PI;
    var arrowIcon=L.divIcon({
      html:'<div style="transform:rotate('+(bearing-90)+'deg);color:'+j.color+';font-size:14px;line-height:1;text-shadow:0 0 4px rgba(0,0,0,0.9);opacity:0.9">&#9654;</div>',
      className:'',iconSize:[14,14],iconAnchor:[7,7]
    });
    L.marker([mLat,mLng],{icon:arrowIcon,interactive:false}).addTo(layerGroup);
  }

  j.cities.forEach(function(city){
    var m=L.marker([city.lat,city.lng],{icon:icon}).addTo(layerGroup);
    (function(c){
      m.on('click',function(){
        var msg=JSON.stringify({type:'city',name:c.name,description:c.description});
        if(window.ReactNativeWebView){window.ReactNativeWebView.postMessage(msg)}
      });
    })(city);
  });

  var bounds=L.latLngBounds(j.cities.map(function(c){return[c.lat,c.lng]}));
  if(j.cities.length>0)map.fitBounds(bounds,{padding:[40,40],maxZoom:8});
};

document.addEventListener('message',function(e){
  try{var m=JSON.parse(e.data);if(m.type==='select')window._selectJourney(m.id)}catch(ex){}
});
window.addEventListener('message',function(e){
  try{var m=JSON.parse(e.data);if(m.type==='select')window._selectJourney(m.id)}catch(ex){}
});
<\/script>
</body>
</html>`
}

function buildFatherMapHtml(isDark: boolean): string {
  const citiesJson = FATHER_CITIES_JSON
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const bodyBg      = isDark ? '#0d1117' : '#f0ebe2'
  const zoomBg      = isDark ? '#1a2030' : '#f5f0e8'
  const zoomColor   = isDark ? '#e2e8f0' : '#2a2218'
  const zoomBorder  = isDark ? '#2d3748' : '#d4cfc6'
  const zoomHover   = isDark ? '#243040' : '#ede8de'
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:${bodyBg};overflow:hidden}
#map{width:100%;height:100%}
.leaflet-control-zoom a{background:${zoomBg}!important;color:${zoomColor}!important;border-color:${zoomBorder}!important}
.leaflet-control-zoom a:hover{background:${zoomHover}!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var CITIES=${citiesJson};
var TC=${TRADITION_COLORS_JSON};
function dominantTradition(fathers){
  var c={};
  fathers.forEach(function(f){var t=f.tradition||'Other';c[t]=(c[t]||0)+1;});
  return Object.keys(c).sort(function(a,b){return c[b]-c[a]})[0]||'Other';
}
var map=L.map('map',{center:[42,20],zoom:4,zoomControl:false});
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('${tileUrl}',{attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19}).addTo(map);
var markers=[];
var selectedCity=null;
var filterTraditions=[];
function updateMarkers(){
  markers.forEach(function(m){
    var tradOk=filterTraditions.length===0||filterTraditions.indexOf(m.tradition)!==-1;
    var cityOk=selectedCity===null||(m.lat===selectedCity.lat&&m.lng===selectedCity.lng);
    var vis=tradOk&&cityOk;
    m.cm.setStyle({fillOpacity:vis?0.85:0.08,opacity:vis?1:0.15});
    if(m.cm._path)m.cm._path.style.pointerEvents=vis?'':'none';
  });
}
CITIES.forEach(function(c){
  var dom=dominantTradition(c.fathers);
  var color=TC[dom]||'#94a3b8';
  var radius=Math.min(8+c.fathers.length*1.5,22);
  var cm=L.circleMarker([c.lat,c.lng],{radius:radius,fillColor:color,color:'#fff',weight:1.5,fillOpacity:0.85}).addTo(map);
  markers.push({cm:cm,lat:c.lat,lng:c.lng,tradition:dom});
  (function(city){
    cm.on('click',function(){
      var msg=JSON.stringify({type:'fatherCity',city:city.displayName,fathers:city.fathers});
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
    });
  })(c);
});
window._selectCity=function(lat,lng){
  selectedCity={lat:lat,lng:lng};
  map.setView([lat,lng],6);
  updateMarkers();
};
window._clearCity=function(){
  selectedCity=null;
  updateMarkers();
};
window._filterTraditions=function(traditions){
  filterTraditions=traditions;
  updateMarkers();
};
<\/script>
</body>
</html>`
}

function buildLettersMapHtml(isDark: boolean): string {
  const lettersJson = RESOLVED_LETTERS_JSON
  const tcJson = TRADITION_COLORS_JSON
  const tileUrl = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  const bodyBg     = isDark ? '#0d1117' : '#f0ebe2'
  const zoomBg     = isDark ? '#1a2030' : '#f5f0e8'
  const zoomColor  = isDark ? '#e2e8f0' : '#2a2218'
  const zoomBorder = isDark ? '#2d3748' : '#d4cfc6'
  const zoomHover  = isDark ? '#243040' : '#ede8de'
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:${bodyBg};overflow:hidden}
#map{width:100%;height:100%}
.leaflet-control-zoom a{background:${zoomBg}!important;color:${zoomColor}!important;border-color:${zoomBorder}!important}
.leaflet-control-zoom a:hover{background:${zoomHover}!important}
</style>
</head>
<body>
<div id="map"></div>
<script>
var LETTERS=${lettersJson};
var TC=${tcJson};
var map=L.map('map',{center:[42,20],zoom:4,zoomControl:false});
L.control.zoom({position:'bottomleft'}).addTo(map);
L.tileLayer('${tileUrl}',{attribution:'&copy; OpenStreetMap &copy; CARTO',maxZoom:19}).addTo(map);

// City pins — always visible, non-interactive
var cities={};
LETTERS.forEach(function(l){
  cities[l.fromCity]={lat:l.fromLat,lng:l.fromLng};
  cities[l.toCity]={lat:l.toLat,lng:l.toLng};
});
Object.values(cities).forEach(function(c){
  L.circleMarker([c.lat,c.lng],{radius:5,fillColor:'#e2e8f0',color:'#64748b',weight:1.5,fillOpacity:0.85,interactive:false}).addTo(map);
});

// Build letter items — polyline is interactive, arrow via outer wrapper opacity
var items=[];
LETTERS.forEach(function(l){
  var from=[l.fromLat,l.fromLng],to=[l.toLat,l.toLng];
  var color=TC[l.tradition]||'#94a3b8';
  // Start dim; interactive:true so tapping the line fires the click
  var line=L.polyline([from,to],{color:color,weight:6,opacity:0.06}).addTo(map);

  // Bearing for arrowhead direction
  var dLng=(to[1]-from[1])*Math.PI/180;
  var lat1R=from[0]*Math.PI/180,lat2R=to[0]*Math.PI/180;
  var yB=Math.sin(dLng)*Math.cos(lat2R);
  var xB=Math.cos(lat1R)*Math.sin(lat2R)-Math.sin(lat1R)*Math.cos(lat2R)*Math.cos(dLng);
  var bearing=Math.atan2(yB,xB)*180/Math.PI;
  var mLat=(from[0]+to[0])/2,mLng=(from[1]+to[1])/2;
  // Arrow: start visible but outer wrapper hidden — we control outer wrapper opacity
  var arrowHtml='<div style="transform:rotate('+(bearing-90)+'deg);color:'+color+';font-size:14px;line-height:1">&#9654;</div>';
  var arrowIcon=L.divIcon({html:arrowHtml,className:'',iconSize:[14,14],iconAnchor:[7,7]});
  var arrow=L.marker([mLat,mLng],{icon:arrowIcon,interactive:false}).addTo(map);
  // Hide arrow wrapper immediately (outer div controls visibility)
  var arrowWrapper=arrow.getElement();
  if(arrowWrapper)arrowWrapper.style.opacity='0';

  items.push({id:l.id,line:line,arrow:arrow,tradition:l.tradition,fromFather:l.fromFather});

  (function(letter){
    line.on('click',function(){
      var msg=JSON.stringify({type:'letterClick',id:letter.id});
      if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(msg);
    });
  })(l);
});

function applyFilter(tradition,sender){
  items.forEach(function(item){
    var tradOk=!tradition||item.tradition===tradition;
    var sendOk=!sender||item.fromFather===sender;
    var vis=tradOk&&sendOk;
    item.line.setStyle({opacity:vis?0.85:0.06});
    if(item.line._path)item.line._path.style.pointerEvents=vis?'':'none';
    var w=item.arrow.getElement();
    if(w)w.style.opacity=vis?'1':'0';
  });
}

window._filterLetters=function(tradition,sender){applyFilter(tradition,sender);};
window._clearLetterFilter=function(){
  items.forEach(function(item){
    item.line.setStyle({opacity:0.06});
    if(item.line._path)item.line._path.style.pointerEvents='none';
    var w=item.arrow.getElement();
    if(w)w.style.opacity='0';
  });
};
<\/script>
</body>
</html>`
}

export default function MapPanel({ selected, onNavigateToFather }: Props) {
  const { colors, themeKey } = useTheme()
  const isDark = themeKey !== 'light'
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const [mode, setMode] = useState<'journeys' | 'fathers' | 'letters'>('journeys')
  const activeMapHtml = useMemo(
    () => mode === 'journeys' ? buildMapHtml(isDark)
        : mode === 'fathers'  ? buildFatherMapHtml(isDark)
        : buildLettersMapHtml(isDark),
    [mode, isDark]
  )
  const webViewRef = useRef<WebView>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cityCard, setCityCard] = useState<CityInfo | null>(null)
  const [selectedPlaceCity, setSelectedPlaceCity] = useState<FatherCity | null>(null)
  const [selectedFather, setSelectedFather] = useState<string | null>(null)
  const [pinnedCity, setPinnedCity] = useState<FatherCity | null>(null)
  const [selectedTraditions, setSelectedTraditions] = useState<string[]>([])
  const [letterCard, setLetterCard] = useState<FatherLetter | null>(null)
  const [letterTradition, setLetterTradition] = useState<string | null>(null)
  const [letterSender, setLetterSender] = useState<string | null>(null)
  const [letterTradSelectorOpen, setLetterTradSelectorOpen] = useState(false)
  const [letterSendSelectorOpen, setLetterSendSelectorOpen] = useState(false)
  // Unique traditions + senders, filtered by each other (base lists hoisted at module level)
  const letterSenders = useMemo(() => {
    const src = letterTradition
      ? FATHER_LETTERS.filter(l => l.tradition === letterTradition)
      : FATHER_LETTERS
    return [...new Set(src.map(l => l.fromFather))].sort()
  }, [letterTradition])
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [placeSelectorOpen, setPlaceSelectorOpen] = useState(false)
  const [fatherSelectorOpen, setFatherSelectorOpen] = useState(false)
  const [webViewReady, setWebViewReady] = useState(false)
  const filteredCities = useMemo(() => {
    let cities = selectedFather
      ? SORTED_CITIES.filter(c => c.fathers.some(f => f.name === selectedFather))
      : SORTED_CITIES
    if (selectedTraditions.length > 0)
      cities = cities.filter(c => c.fathers.some(f => selectedTraditions.includes(f.tradition ?? '')))
    return cities
  }, [selectedFather, SORTED_CITIES, selectedTraditions])

  const filteredFathers = useMemo(() => {
    let src = selectedPlaceCity ? selectedPlaceCity.fathers : ALL_FATHERS
    if (selectedTraditions.length > 0)
      src = src.filter(f => selectedTraditions.includes(f.tradition ?? ''))
    return [...src].sort((a, b) => a.sort - b.sort)
  }, [selectedPlaceCity, selectedTraditions])

  const highlightedCity = useMemo(() => {
    if (selectedPlaceCity) return selectedPlaceCity
    if (selectedFather) return FATHER_CITIES.find(c => c.fathers.some(f => f.name === selectedFather)) ?? null
    return null
  }, [selectedPlaceCity, selectedFather])

  // Passage-aware auto-select (journeys only)
  useEffect(() => {
    if (!selected) return
    const match = getJourneyForPassage(selected.book, selected.chapter)
    if (match) setActiveId(match)
  }, [selected?.book, selected?.chapter])

  // Inject journey selection (journeys mode)
  useEffect(() => {
    if (!webViewReady || !activeId || mode !== 'journeys') return
    webViewRef.current?.injectJavaScript(
      `window._selectJourney(${JSON.stringify(activeId)}); true;`
    )
  }, [activeId, webViewReady, mode])

  // Sync letter filter
  useEffect(() => {
    if (!webViewReady || mode !== 'letters') return
    if (letterTradition || letterSender) {
      webViewRef.current?.injectJavaScript(
        `window._filterLetters(${JSON.stringify(letterTradition)},${JSON.stringify(letterSender)}); true;`
      )
    } else {
      webViewRef.current?.injectJavaScript(`window._clearLetterFilter(); true;`)
    }
  }, [letterTradition, letterSender, webViewReady, mode])

  // Sync city highlight + tradition filter together (both need same guard)
  useEffect(() => {
    if (!webViewReady || mode !== 'fathers') return
    if (highlightedCity) {
      webViewRef.current?.injectJavaScript(
        `window._selectCity(${highlightedCity.lat},${highlightedCity.lng}); true;`
      )
    } else {
      webViewRef.current?.injectJavaScript(`window._clearCity(); true;`)
    }
    webViewRef.current?.injectJavaScript(
      `window._filterTraditions(${JSON.stringify(selectedTraditions)}); true;`
    )
  }, [highlightedCity, selectedTraditions, webViewReady, mode])

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'city') setCityCard({ name: msg.name, description: msg.description })
      else if (msg.type === 'fatherCity') {
        const city = FATHER_CITIES.find(c => c.displayName === msg.city) ?? null
        setPinnedCity(city)
      } else if (msg.type === 'letterClick') {
        const letter = FATHER_LETTERS.find(l => l.id === msg.id) ?? null
        setLetterCard(letter)
        setLetterTradSelectorOpen(false)
        setLetterSendSelectorOpen(false)
      }
    } catch {}
  }, [])

  const handleLoadEnd = useCallback(() => setWebViewReady(true), [])

  const selectJourney = useCallback((id: string) => {
    setActiveId(id)
    setSelectorOpen(false)
    setCityCard(null)
  }, [])

  const selectPlace = useCallback((city: FatherCity) => {
    setSelectedPlaceCity(city)
    setSelectedFather(null)
    setPlaceSelectorOpen(false)
  }, [])

  const selectFatherFromDropdown = useCallback((name: string) => {
    setSelectedFather(name)
    setFatherSelectorOpen(false)
  }, [])

  const activeJourney = JOURNEYS.find(j => j.id === activeId)

  return (
    <View style={styles.container}>
      {/* Map — key forces remount on theme/mode change */}
      <WebView
        key={`${mode}-${themeKey}`}
        ref={webViewRef}
        source={{ html: activeMapHtml }}
        javaScriptEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        style={styles.webview}
      />

      {/* Overlay — mode toggle + journey selector */}
      <View style={styles.selectorOverlay} pointerEvents="box-none">

        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'journeys' && styles.modeBtnActive]}
            onPress={() => { setMode('journeys'); setSelectedPlaceCity(null); setSelectedFather(null); setPinnedCity(null); setSelectedTraditions([]); setLetterCard(null); setLetterTradition(null); setLetterSender(null) }}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={13} color={mode === 'journeys' ? colors.accent : colors.textMuted} />
            <Text style={[styles.modeBtnLabel, mode === 'journeys' && styles.modeBtnLabelActive]}>Journeys</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'fathers' && styles.modeBtnActive]}
            onPress={() => { setMode('fathers'); setCityCard(null); setLetterCard(null) }}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={13} color={mode === 'fathers' ? colors.accent : colors.textMuted} />
            <Text style={[styles.modeBtnLabel, mode === 'fathers' && styles.modeBtnLabelActive]}>Fathers</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'letters' && styles.modeBtnActive]}
            onPress={() => { setMode('letters'); setCityCard(null); setPinnedCity(null); setSelectedPlaceCity(null); setSelectedFather(null); setSelectedTraditions([]); setLetterTradition(null); setLetterSender(null) }}
            activeOpacity={0.8}
          >
            <Ionicons name="mail-outline" size={13} color={mode === 'letters' ? colors.accent : colors.textMuted} />
            <Text style={[styles.modeBtnLabel, mode === 'letters' && styles.modeBtnLabelActive]}>Letters</Text>
          </TouchableOpacity>
        </View>

        {/* Journey selector (journeys mode only) */}
        {mode === 'journeys' && (
          <>
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => { setSelectorOpen(o => !o); setCityCard(null) }}
              activeOpacity={0.85}
            >
              {activeJourney ? (
                <>
                  <View style={[styles.dot, { backgroundColor: activeJourney.color }]} />
                  <Text style={styles.selectorLabel} numberOfLines={1}>{activeJourney.label}</Text>
                </>
              ) : (
                <Text style={styles.selectorPlaceholder}>Select a journey…</Text>
              )}
              <Ionicons
                name={selectorOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={colors.textMuted}
                style={{ marginLeft: 4 }}
              />
            </TouchableOpacity>

            {selectorOpen && (
              <ScrollView
                style={styles.dropdown}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {GROUPS.map(group => (
                  <View key={group.label}>
                    <Text style={styles.groupLabel}>{group.label}</Text>
                    {JOURNEYS.filter(j => group.ids.includes(j.id)).map(j => (
                      <TouchableOpacity
                        key={j.id}
                        style={[styles.journeyItem, activeId === j.id && styles.journeyItemActive]}
                        onPress={() => selectJourney(j.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.dot, { backgroundColor: j.color }]} />
                        <Text style={[styles.journeyItemLabel, activeId === j.id && styles.journeyItemLabelActive]}>
                          {j.label}
                        </Text>
                        {activeId === j.id && (
                          <Ionicons name="checkmark" size={14} color={colors.accent} />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Fathers mode — two dropdowns side by side */}
        {mode === 'fathers' && (
          <>
            <View style={styles.horizontalPickers}>
              {/* Place picker */}
              <TouchableOpacity
                style={[styles.selectorBtn, { flex: 1 }]}
                onPress={() => {
                  if (selectedPlaceCity) { setSelectedPlaceCity(null); setSelectedFather(null) }
                  else { setPlaceSelectorOpen(o => !o); setFatherSelectorOpen(false) }
                }}
                activeOpacity={0.85}
              >
                {selectedPlaceCity
                  ? <Text style={styles.selectorLabel} numberOfLines={1}>{selectedPlaceCity.displayName}</Text>
                  : <Text style={styles.selectorPlaceholder}>Place…</Text>
                }
                <Ionicons
                  name={selectedPlaceCity ? 'close-circle' : placeSelectorOpen ? 'chevron-up' : 'chevron-down'}
                  size={14} color={colors.textMuted} style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              <View style={{ width: 6 }} />

              {/* Father picker */}
              <TouchableOpacity
                style={[styles.selectorBtn, { flex: 1 }]}
                onPress={() => {
                  if (selectedFather) { setSelectedFather(null) }
                  else { setFatherSelectorOpen(o => !o); setPlaceSelectorOpen(false) }
                }}
                activeOpacity={0.85}
              >
                {selectedFather
                  ? <Text style={styles.selectorLabel} numberOfLines={1}>{selectedFather}</Text>
                  : <Text style={styles.selectorPlaceholder}>Father…</Text>
                }
                <Ionicons
                  name={selectedFather ? 'close-circle' : fatherSelectorOpen ? 'chevron-up' : 'chevron-down'}
                  size={14} color={colors.textMuted} style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {placeSelectorOpen && (
              <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {filteredCities.map(city => (
                  <TouchableOpacity
                    key={city.displayName}
                    style={[styles.journeyItem, selectedPlaceCity?.displayName === city.displayName && styles.journeyItemActive]}
                    onPress={() => selectPlace(city)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.journeyItemLabel, selectedPlaceCity?.displayName === city.displayName && styles.journeyItemLabelActive]} numberOfLines={1}>
                      {city.displayName}
                    </Text>
                    <Text style={styles.fatherRowDates}>{city.fathers.length}</Text>
                    {selectedPlaceCity?.displayName === city.displayName && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {fatherSelectorOpen && (
              <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {filteredFathers.map((f, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.journeyItem, selectedFather === f.name && styles.journeyItemActive]}
                    onPress={() => selectFatherFromDropdown(f.name)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.traditionDot, { backgroundColor: TRADITION_COLORS[f.tradition ?? ''] ?? '#94a3b8', marginTop: 0 }]} />
                    <Text style={[styles.journeyItemLabel, selectedFather === f.name && styles.journeyItemLabelActive]} numberOfLines={1}>{f.name}</Text>
                    {selectedFather === f.name && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}

        {/* Letters mode — two filter dropdowns */}
        {mode === 'letters' && (
          <>
            <View style={styles.horizontalPickers}>
              {/* Tradition filter */}
              <TouchableOpacity
                style={[styles.selectorBtn, { flex: 1 }]}
                onPress={() => {
                  if (letterTradition) { setLetterTradition(null); setLetterSender(null) }
                  else { setLetterTradSelectorOpen(o => !o); setLetterSendSelectorOpen(false) }
                }}
                activeOpacity={0.85}
              >
                {letterTradition
                  ? <Text style={styles.selectorLabel} numberOfLines={1}>{letterTradition}</Text>
                  : <Text style={styles.selectorPlaceholder}>Tradition…</Text>
                }
                <Ionicons
                  name={letterTradition ? 'close-circle' : letterTradSelectorOpen ? 'chevron-up' : 'chevron-down'}
                  size={14} color={colors.textMuted} style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>

              <View style={{ width: 6 }} />

              {/* Sender filter */}
              <TouchableOpacity
                style={[styles.selectorBtn, { flex: 1 }]}
                onPress={() => {
                  if (letterSender) { setLetterSender(null) }
                  else { setLetterSendSelectorOpen(o => !o); setLetterTradSelectorOpen(false) }
                }}
                activeOpacity={0.85}
              >
                {letterSender
                  ? <Text style={styles.selectorLabel} numberOfLines={1}>{letterSender}</Text>
                  : <Text style={styles.selectorPlaceholder}>Sender…</Text>
                }
                <Ionicons
                  name={letterSender ? 'close-circle' : letterSendSelectorOpen ? 'chevron-up' : 'chevron-down'}
                  size={14} color={colors.textMuted} style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {letterTradSelectorOpen && (
              <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {LETTER_TRADITIONS.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.journeyItem, letterTradition === t && styles.journeyItemActive]}
                    onPress={() => { setLetterTradition(t); setLetterSender(null); setLetterTradSelectorOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.traditionDot, { backgroundColor: TRADITION_COLORS[t] ?? '#94a3b8', marginTop: 0 }]} />
                    <Text style={[styles.journeyItemLabel, letterTradition === t && styles.journeyItemLabelActive]}>{t}</Text>
                    {letterTradition === t && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {letterSendSelectorOpen && (
              <ScrollView style={styles.dropdown} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {letterSenders.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.journeyItem, letterSender === s && styles.journeyItemActive]}
                    onPress={() => { setLetterSender(s); setLetterSendSelectorOpen(false) }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.journeyItemLabel, letterSender === s && styles.journeyItemLabelActive]} numberOfLines={1}>{s}</Text>
                    {letterSender === s && <Ionicons name="checkmark" size={14} color={colors.accent} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </>
        )}
      </View>

      {/* Journey city card */}
      {mode === 'journeys' && !!cityCard && !selectorOpen && (
        <TouchableOpacity
          style={styles.cityCard}
          onPress={() => setCityCard(null)}
          activeOpacity={0.9}
        >
          <View style={styles.cityCardInner}>
            <Text style={styles.cityName}>{cityCard.name}</Text>
            <Text style={styles.cityDesc}>{cityCard.description}</Text>
            <Text style={styles.cityDismiss}>Tap to dismiss</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Father pin-tap card */}
      {mode === 'fathers' && !!pinnedCity && !placeSelectorOpen && !fatherSelectorOpen && (
        <View style={styles.cityCard}>
          <View style={styles.cityCardInner}>
            <TouchableOpacity style={styles.cityCardHeader} onPress={() => setPinnedCity(null)} activeOpacity={0.7}>
              <Text style={styles.cityName}>{pinnedCity.displayName}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
              {[...pinnedCity.fathers].sort((a, b) => a.sort - b.sort).map((f, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.fatherRow}
                  onPress={() => onNavigateToFather?.(f.name)}
                  activeOpacity={onNavigateToFather ? 0.6 : 1}
                  disabled={!onNavigateToFather}
                >
                  <View style={[styles.traditionDot, { backgroundColor: TRADITION_COLORS[f.tradition ?? ''] ?? '#94a3b8' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.fatherRowName, !!onNavigateToFather && { color: colors.accent }]}>{f.name}</Text>
                    {!!f.role && <Text style={styles.fatherRowRole}>{f.role}</Text>}
                    <Text style={styles.fatherRowDates}>{f.dates}{f.tradition ? ` · ${f.tradition}` : ''}</Text>
                  </View>
                  {!!onNavigateToFather && <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Letter card */}
      {mode === 'letters' && !!letterCard && !letterTradSelectorOpen && !letterSendSelectorOpen && (
        <TouchableOpacity style={styles.cityCard} onPress={() => setLetterCard(null)} activeOpacity={0.9}>
          <View style={styles.cityCardInner}>
            <View style={styles.cityCardHeader}>
              <View style={[styles.dot, { backgroundColor: TRADITION_COLORS[letterCard.tradition] ?? '#94a3b8', width: 10, height: 10, borderRadius: 5 }]} />
              <Text style={[styles.cityName, { flex: 1 }]} numberOfLines={2}>{letterCard.label}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </View>
            <Text style={styles.cityDesc}>
              <Text style={{ fontWeight: '600' }}>{letterCard.fromFather}</Text>
              {` → ${letterCard.toLabel}`}
            </Text>
            <Text style={[styles.cityDesc, { color: colors.textMuted }]}>
              {letterCard.fromCity} → {letterCard.toCity} · {letterCard.year}
            </Text>
            <Text style={styles.cityDismiss}>Tap to dismiss</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Tradition colour legend (fathers mode) — hidden when card is open */}
      {mode === 'fathers' && !pinnedCity && (
        <View style={styles.legend}>
          {LEGEND_ITEMS.map(({ label, color }) => {
            const active = selectedTraditions.includes(label)
            const dimmed = selectedTraditions.length > 0 && !active
            return (
              <TouchableOpacity
                key={label}
                style={[styles.legendRow, active && styles.legendRowActive]}
                onPress={() => setSelectedTraditions(prev =>
                  prev.includes(label) ? prev.filter(t => t !== label) : [...prev, label]
                )}
                activeOpacity={0.7}
              >
                <View style={[styles.legendDot, { backgroundColor: color, opacity: dimmed ? 0.35 : 1 }]} />
                <Text style={[styles.legendLabel, dimmed && styles.legendLabelDimmed, active && styles.legendLabelActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}

    </View>
  )
}

const makeStyles = (c: ThemeColors, isDark: boolean) => {
  const overlayBg     = isDark ? 'rgba(13,17,23,0.90)' : 'rgba(245,240,232,0.93)'
  const overlayBorder = isDark ? 'rgba(80,110,160,0.30)' : 'rgba(180,165,150,0.50)'
  const activeHighlight = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'
  const mapBg = isDark ? '#0d1117' : '#f0ebe2'
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: mapBg,
    },
    webview: {
      flex: 1,
      backgroundColor: mapBg,
    },

    // ── Selector overlay ──
    selectorOverlay: {
      position: 'absolute',
      top: 10,
      left: 10,
      right: 10,
    },
    selectorBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: overlayBg,
      borderWidth: 1,
      borderColor: overlayBorder,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 8,
    },
    dot: {
      width: 10,
      height: 10,
      borderRadius: 5,
    },
    selectorLabel: {
      flex: 1,
      color: c.textPrimary,
      fontSize: 14,
      fontWeight: '500',
    },
    selectorPlaceholder: {
      flex: 1,
      color: c.textMuted,
      fontSize: 14,
    },

    // ── Dropdown ──
    dropdown: {
      marginTop: 4,
      backgroundColor: overlayBg,
      borderWidth: 1,
      borderColor: overlayBorder,
      borderRadius: 8,
      maxHeight: 320,
    },
    groupLabel: {
      color: c.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 4,
    },
    journeyItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 9,
      gap: 10,
    },
    journeyItemActive: {
      backgroundColor: activeHighlight,
    },
    journeyItemLabel: {
      flex: 1,
      color: c.textSecondary,
      fontSize: 14,
    },
    journeyItemLabelActive: {
      color: c.textPrimary,
      fontWeight: '500',
    },

    // ── Horizontal picker row (place + father side by side) ──
    horizontalPickers: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    // ── Mode toggle ──
    modeToggle: {
      flexDirection: 'row',
      backgroundColor: overlayBg,
      borderWidth: 1,
      borderColor: overlayBorder,
      borderRadius: 8,
      marginBottom: 6,
      overflow: 'hidden',
    },
    modeBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      gap: 5,
    },
    modeBtnActive: {
      backgroundColor: activeHighlight,
    },
    modeBtnLabel: {
      color: c.textMuted,
      fontSize: 13,
      fontWeight: '500',
    },
    modeBtnLabelActive: {
      color: c.accent,
    },

    // ── Father row (inside city card) ──
    fatherRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      paddingVertical: 6,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: overlayBorder,
    },
    traditionDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      marginTop: 3,
      flexShrink: 0,
    },
    fatherRowName: {
      color: c.textPrimary,
      fontSize: 13,
      fontWeight: '600',
    },
    fatherRowRole: {
      color: c.textSecondary,
      fontSize: 11,
      lineHeight: 16,
    },
    fatherRowDates: {
      color: c.textMuted,
      fontSize: 11,
    },

    // ── Tradition legend ──
    legend: {
      position: 'absolute',
      bottom: 30,
      right: 10,
      backgroundColor: overlayBg,
      borderWidth: 1,
      borderColor: overlayBorder,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 5,
    },
    legendDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: 4,
      paddingHorizontal: 4,
      paddingVertical: 2,
    },
    legendRowActive: {
      backgroundColor: activeHighlight,
    },
    legendLabel: {
      color: c.textSecondary,
      fontSize: 11,
    },
    legendLabelActive: {
      color: c.accent,
      fontWeight: '600',
    },
    legendLabelDimmed: {
      color: c.textMuted,
    },

    // ── City card header ──
    cityCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },

    // ── City card ──
    cityCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
    },
    cityCardInner: {
      backgroundColor: overlayBg,
      borderTopWidth: 1,
      borderTopColor: overlayBorder,
      paddingHorizontal: 16,
      paddingVertical: 14,
      paddingBottom: 20,
      gap: 5,
    },
    cityName: {
      color: c.textPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    cityDesc: {
      color: c.textSecondary,
      fontSize: 13,
      lineHeight: 19,
    },
    cityDismiss: {
      color: c.textMuted,
      fontSize: 11,
      marginTop: 4,
    },
  })
}
