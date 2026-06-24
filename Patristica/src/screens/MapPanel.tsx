import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import { Ionicons } from '@expo/vector-icons'
import { JOURNEYS } from '../data/mapData'
import { getJourneyForPassage } from '../data/mapContext'
import { useTheme } from '../context/ThemeContext'
import type { ThemeColors } from '../theme/themes'
import type { SelectedVerse } from '../types'

interface Props {
  selected: SelectedVerse | null
}

interface CityInfo {
  name: string
  description: string
}

const GROUPS = [
  { label: 'Old Testament',   ids: ['abraham', 'exodus', 'exile'] },
  { label: 'New Testament',   ids: ['jesus-ministry', 'seven-churches', 'jonah', 'flight-egypt'] },
  { label: "Paul's Journeys", ids: ['paul-1', 'paul-2', 'paul-3', 'paul-4'] },
]

function buildMapHtml(isDark: boolean): string {
  const journeysJson = JSON.stringify(JOURNEYS)
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

export default function MapPanel({ selected }: Props) {
  const { colors, themeKey } = useTheme()
  const isDark = themeKey !== 'light'
  const styles = useMemo(() => makeStyles(colors, isDark), [colors, isDark])
  const mapHtml = useMemo(() => buildMapHtml(isDark), [isDark])
  const webViewRef = useRef<WebView>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [cityCard, setCityCard] = useState<CityInfo | null>(null)
  const [selectorOpen, setSelectorOpen] = useState(false)
  const [webViewReady, setWebViewReady] = useState(false)

  // Reset WebView ready state when theme changes (key prop causes remount)
  useEffect(() => { setWebViewReady(false) }, [themeKey])

  // Passage-aware auto-select
  useEffect(() => {
    if (!selected) return
    const match = getJourneyForPassage(selected.book, selected.chapter)
    if (match) setActiveId(match)
  }, [selected?.book, selected?.chapter])

  // Inject journey selection into WebView
  useEffect(() => {
    if (!webViewReady || !activeId) return
    webViewRef.current?.injectJavaScript(
      `window._selectJourney(${JSON.stringify(activeId)}); true;`
    )
  }, [activeId, webViewReady])

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data)
      if (msg.type === 'city') setCityCard({ name: msg.name, description: msg.description })
    } catch {}
  }, [])

  const handleLoadEnd = useCallback(() => setWebViewReady(true), [])

  const selectJourney = useCallback((id: string) => {
    setActiveId(id)
    setSelectorOpen(false)
    setCityCard(null)
  }, [])

  const activeJourney = JOURNEYS.find(j => j.id === activeId)

  return (
    <View style={styles.container}>
      {/* Map — key forces remount on theme change so tile layer updates */}
      <WebView
        key={themeKey}
        ref={webViewRef}
        source={{ html: mapHtml }}
        javaScriptEnabled
        originWhitelist={['*']}
        onMessage={handleMessage}
        onLoadEnd={handleLoadEnd}
        style={styles.webview}
      />

      {/* Selector bar — overlaid on map */}
      <View style={styles.selectorOverlay} pointerEvents="box-none">
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
      </View>

      {/* City description card */}
      {!!cityCard && !selectorOpen && (
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
