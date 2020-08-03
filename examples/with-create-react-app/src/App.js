import React from "react"
import "@google/model-viewer/dist/model-viewer-legacy"

import Astronaut from './Astronaut.glb'

export default function App() {
  return <model-viewer src={Astronaut} auto-rotate camera-controls />
}