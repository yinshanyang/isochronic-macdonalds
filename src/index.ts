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
const contours = require('./data/contours.geo.json')
const points = require('./data/macdonalds.geo.json')

// prepare the data
// sort points by longitude
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
  pointsHash[name] = {
    coordinates: {
      lat: feature.geometry.coordinates[1],
      lng: feature.geometry.coordinates[0],
    },
    color: hsluv.hsluvToHex([(index / contours.features.length) * 360, 50, 50]),
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
            0.1,
          ],
        },
      },
      'water'
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
