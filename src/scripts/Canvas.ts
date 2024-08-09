import * as THREE from 'three'
import { OrthographicCamera } from './core/Camera'
import { RawShaderMaterial } from './core/ExtendedMaterials'
import { Three } from './core/Three'
import { pane } from './Gui'
import { shader, ShaderName } from './shader/shaders'
import { Simulatior } from './simulation/Simulatior'

export class Canvas extends Three {
  private readonly simulatior: Simulatior
  private camera: OrthographicCamera
  private fillFramebuffers: THREE.WebGLRenderTarget[] = []

  constructor(canvas: HTMLCanvasElement) {
    super(canvas)
    this.camera = new OrthographicCamera()

    this.simulatior = new Simulatior(this.renderer, this.scene)

    this.loadParams()

    this.createFillFrameBuffers()
    this.setGui()

    window.addEventListener('resize', this.resize.bind(this))

    this.load().then((texture) => {
      this.createMeshes(texture)

      this.renderer.setAnimationLoop(this.anime.bind(this))
    })
  }

  private async load() {
    const loader = new THREE.TextureLoader()
    const texture = await loader.loadAsync(import.meta.env.BASE_URL + '/images/unsplash.jpg')
    texture.userData.aspect = texture.source.data.width / texture.source.data.height
    return texture
  }

  private loadParams() {
    const params = localStorage.getItem('params')
    if (params) {
      this.simulatior.params = JSON.parse(params)
      pane.refresh()
    }
  }

  private setGui() {
    pane.expanded = false
    pane.title = 'paramaters'
    pane.addFpsBlade()
    pane.addBinding(this.simulatior, 'isDrawDensity', { label: 'draw_density' })
    pane.addBinding(this.simulatior, 'isAdditional', { label: 'additional_velocity' }).on('change', (v) => {
      this.simulatior.params.additionalVelocity = v.value ? 1 : 0
      this.resetFrameBuffers()
    })
    pane.addBinding(this.simulatior.params, 'timeStep', { min: 0.001, max: 0.01, step: 0.001, label: 'time_step' })
    pane.addBinding(this.simulatior.params, 'forceRadius', { min: 0.001, max: 0.1, step: 0.001, label: 'force_radius' })
    pane.addBinding(this.simulatior.params, 'forceIntensity', { min: 1, max: 100, step: 1, label: 'force_intensity' })
    pane.addBinding(this.simulatior.params, 'forceAttenuation', { min: 0, max: 0.1, step: 0.001, label: 'force_attenuation' })
    pane.addBinding(this.simulatior.params, 'diffuse', { min: 0, max: 0.1, step: 0.001, label: 'diffuse' })
    pane.addButton({ title: 'reset buffer' }).on('click', () => this.resetFrameBuffers())
    pane.addButton({ title: 'save params' }).on('click', () => localStorage.setItem('params', JSON.stringify(this.simulatior.params)))
  }

  private createFillFrameBuffers() {
    const { width, height } = this.size
    const create = () =>
      new THREE.WebGLRenderTarget(width, height, {
        type: THREE.FloatType,
        format: THREE.RGBAFormat,
      })

    this.fillFramebuffers = [create(), create()]
  }

  private resetFrameBuffers() {
    this.simulatior.resetFrameBuffers()

    this.fillFramebuffers.forEach((buffer) => {
      this.use('resetFill')
      this.bind(buffer)
      this.render()
    })
  }

  private createMesh(name: ShaderName, uniforms?: { [uniform: string]: THREE.IUniform<any> }) {
    const geo = new THREE.PlaneGeometry(2, 2)
    const mat = new RawShaderMaterial({
      uniforms: uniforms ?? {},
      vertexShader: shader.base,
      fragmentShader: shader[name],
      glslVersion: '300 es',
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.name = name
    this.scene.add(mesh)
    return mesh
  }

  private createMeshes(texture: THREE.Texture) {
    this.createMesh('fill', {
      resolution: { value: [this.size.width, this.size.height] },
      velocityTexture: { value: null },
      fillTexture: { value: null },
    })

    this.createMesh('resetFill')

    this.createMesh('final', {
      resolution: { value: this.simulatior.resolution },
      fillTexture: { value: null },
      velocityTexture: { value: null },
      image: { value: texture },
      coveredScale: { value: this.coveredScale(texture.userData.aspect) },
    })
  }

  private anime() {
    pane.updateFps()

    this.simulatior.update()

    {
      const uniforms = this.material('fill').uniforms
      uniforms.resolution.value = [this.size.width, this.size.height]
      uniforms.velocityTexture.value = this.simulatior.velocityTexture
      uniforms.fillTexture.value = this.texture(this.fillFramebuffers[1])
      this.use('fill')
      this.bind(this.fillFramebuffers[0])
      this.render()
      this.swap(this.fillFramebuffers)
    }

    {
      const uniforms = this.material('final').uniforms
      uniforms.resolution.value = this.simulatior.resolution
      uniforms.velocityTexture.value = this.simulatior.velocityTexture
      uniforms.fillTexture.value = this.texture(this.fillFramebuffers[1])
      uniforms.coveredScale.value = this.coveredScale(uniforms.image.value.userData.aspect)
      this.use('final')
      this.bind(null)
      this.render()
    }
  }

  private resize() {
    this.simulatior.resize()

    for (const buffer of this.fillFramebuffers) {
      buffer.setSize(this.size.width, this.size.height)
    }
    this.resetFrameBuffers()
  }

  // ------------------
  // utility functions
  private use(name: ShaderName) {
    this.scene.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        child.visible = child.name === name
      }
    })
  }

  private bind(renderTarget: THREE.WebGLRenderTarget | null) {
    this.renderer.setRenderTarget(renderTarget)
  }

  private material(name: ShaderName) {
    return (this.scene.getObjectByName(name) as THREE.Mesh<THREE.PlaneGeometry, RawShaderMaterial>).material
  }

  private swap(targets: THREE.WebGLRenderTarget[]) {
    const temp = targets[0]
    targets[0] = targets[1]
    targets[1] = temp
  }

  private texture(renderTarget: THREE.WebGLRenderTarget) {
    return renderTarget.texture
  }

  protected render() {
    this.renderer.render(this.scene, this.camera)
  }
}
