import base from './base.vs'
import fill from './fill.fs'
import final from './final.fs'
import resetFill from './resetFill.fs'

export const shader = {
  base,
  fill,
  resetFill,
  final,
}

export type ShaderName = keyof typeof shader
