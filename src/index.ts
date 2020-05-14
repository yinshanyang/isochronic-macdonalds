import * as mapbox from 'mapbox-gl'
import * as hsluv from 'hsluv'
import 'mapbox-gl/dist/mapbox-gl.css'
import 'tachyons'

// DOM stuff
document.documentElement.className = 'w-100 h-100 ma0 pa0 bg-gray'
document.body.className = 'w-100 h-100 ma0 pa0'

const container = document.createElement('div')
container.id = 'container'
container.className = 'w-100 h-100 absolute top-0 bottom-0 left-0 right-0'
document.body.append(container)

// data stuff
const contours = require('./data/mrts.contours.geo.json')
const points = require('./data/mrts.geo.json')

// prepare the data
// sort points by longitude
const ids = points.features.map((feature) => feature.properties.name)
const lines = {}
ids.forEach((id) => {
  const parts = id.split(';')
  const lineSymbols = parts.map((part) => part.slice(0, 2))
  lineSymbols.forEach((line) => {
    lines[line] = lines[line] || { id: line, stops: 0 }
    lines[line].stops += 1
  })
})
const colors = {
  CC: [60, 100],
  CE: [60, 100],
  CG: [128, 80],
  EW: [128, 80],
  NS: [0, 90],
  DT: [250, 80],
  NE: [285, 60],
  TE: [40, 50],
  // combinations
  NSEW: [110, 100],
  NSTE: [20, 100],
  NSCC: [30, 100],
  NSDT: [340, 100],
  NSNECC: [340, 100],
  NSCETE: [340, 100],

  EWCC: [110, 100],
  EWDT: [150, 100],
  EWNS: [110, 100],
  CGDT: [150, 100],

  NECC: [310, 100],
  NEDT: [270, 100],
  NEEWTE: [310, 100],

  CCDT: [80, 100],
  CEDT: [80, 100],
  CCTE: [60, 100],

  DTTE: [220, 100],
  // CCDT: []
}

const pointsSortedByLongitude = points.features
  .map((feature) => ({
    name: feature.properties.name,
    longitude: feature.geometry.coordinates[0],
  }))
  .sort((a, b) => a.longitude - b.longitude)
const pointsHash = {}
pointsSortedByLongitude.forEach(({ name }, index) => {
  const feature = points.features.find(
    ({ properties }) => properties.name === name
  )
  const id = feature.properties.id.split(';')
  const line = id
    .map((d) => d.slice(0, 2))
    .filter((d) => d !== 'JE' && d !== 'JS' && d !== 'PT' && d !== 'CR')
    .join('')
  pointsHash[name] = {
    coordinates: {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    },
    // color: hsluv.hsluvToHex([(index / contours.features.length) * 360, 50, 50]),
    color: hsluv.hsluvToHex([
      colors[line] && colors[line][0],
      // ((stop - 1) / lines[line].stops) * 60 + 40,
      colors[line] && colors[line][1],
      65,
    ]),
  }
})

// assign colors to contours and points
contours.features.forEach((feature, id) => {
  feature.id = id
  feature.properties.id = id
  feature.properties.color = pointsHash[feature.properties.name].color
})
points.features.forEach((feature, id) => {
  feature.id = id
  feature.properties.id = id
  feature.properties.color = pointsHash[feature.properties.name].color
})

// mapbox
;(() => {
  mapbox.accessToken =
    'pk.eyJ1Ijoic3dhcm0tM2hrIiwiYSI6ImNrNzQ3MGMzdTBrb3gzZXI5ZzFoMnRjdncifQ.mTpq5nqsAyfsWOUtH9WoNg'
  const map = new mapbox.Map({
    container: 'container',
    style: 'mapbox://styles/mapbox/light-v10',
    center: [103.834534, 1.316688],
    maxBounds: [
      [103.460999, 1.0834620335045826],
      [104.208069, 1.6024216765509463],
    ],
  })
  map.fitBounds([
    [103.596954345, 1.23312012479],
    [104.049453735, 1.47887018872],
  ])
  map.dragRotate.disable()
  map.touchZoomRotate.disableRotation()

  // state
  let state = {
    hovered: null,
    popup: new mapbox.Popup({
      closeButton: false,
      anchor: 'top-left',
      offset: 12,
    }),
  }

  map.on('load', () => {
    // sources
    map.addSource('contours', {
      type: 'geojson',
      data: contours,
    })
    map.addSource('points', {
      type: 'geojson',
      data: points,
    })
    map.addSource('points-dimmed', {
      type: 'geojson',
      data: points,
    })

    // layers
    map.addLayer(
      {
        id: 'contours-fill',
        type: 'fill',
        source: 'contours',
        paint: {
          'fill-color': ['get', 'color'],
          'fill-outline-color': '#fff',
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.7,
            0.2,
          ],
        },
      }
      // 'water'
    )
    map.addLayer({
      id: 'contours-stroke',
      type: 'line',
      source: 'contours',
      paint: {
        'line-color': ['get', 'color'],
        'line-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1,
          0.2,
        ],
      },
    })
    map.addLayer({
      id: 'points-dimmed',
      type: 'circle',
      source: 'points-dimmed',
      paint: {
        'circle-radius': 4,
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
        'circle-opacity': 0.5,
      },
    })
    map.addLayer({
      id: 'points-shadow',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 12,
        'circle-color': '#000',
        'circle-blur': 1,
        'circle-opacity': 0.5,
      },
    })
    map.addLayer({
      id: 'points',
      type: 'circle',
      source: 'points',
      paint: {
        'circle-radius': 4,
        'circle-color': ['get', 'color'],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
      },
    })

    // events
    map.on('click', 'contours-fill', function (evt) {
      evt.preventDefault()
      evt.stopPropagation() // let’s just throw an error
    })
    map.on('mousemove', 'contours-fill', function (evt) {
      map.getCanvas().style.cursor = 'pointer'
      if (evt.features.length > 0) {
        const feature = evt.features[0]

        if (state.hovered !== null) {
          map.setFeatureState(
            { source: 'contours', id: state.hovered },
            { hover: false }
          )
        }

        state.hovered = feature.id
        map.setFeatureState(
          { source: 'contours', id: state.hovered },
          { hover: true }
        )
        map.setFilter('points-shadow', ['in', 'id', state.hovered])
        map.setFilter('points', ['in', 'id', state.hovered])

        // set pop up
        state.popup
          .setLngLat(evt.lngLat)
          .setText(feature.properties.name)
          .addTo(map)
      }
    })
    map.on('mouseleave', 'contours-fill', function () {
      map.getCanvas().style.cursor = ''
      if (state.hovered) {
        map.setFeatureState(
          { source: 'contours', id: state.hovered },
          { hover: false }
        )
      }
      map.setFilter('points-shadow', ['has', 'id'])
      map.setFilter('points', ['has', 'id'])
      state.hovered = null
      state.popup.remove()
    })
  })
})()
