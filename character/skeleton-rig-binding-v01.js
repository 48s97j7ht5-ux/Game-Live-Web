import * as THREE from 'three';

/**
 * Skeleton Rig Binding v0.1
 * Binds visual meshes from Skeleton v1.2 to the dimension-independent mechanical rig.
 * No fixed anatomical lengths are stored here.
 */
export class SkeletonRigBinding {
  constructor(sourceRoot,rig){
    this.sourceRoot=sourceRoot;
    this.rig=rig;
    this.bindings=[];
    this.restWorld=new Map();
    this.driverRestWorld=new Map();
    this._captureRest();
    this.rebuild();
  }

  _captureRest(){
    this.sourceRoot.updateMatrixWorld(true);
    this.sourceRoot.traverse(o=>{if(o.isMesh)this.restWorld.set(o.uuid,o.matrixWorld.clone());});
    for(const name of ['hip_L','knee_L','ankle_L']){
      const n=this.rig.getNode(name);
      n.updateMatrixWorld(true);
      this.driverRestWorld.set(name,n.matrixWorld.clone());
    }
  }

  rebuild(){
    this.bindings=[];
    this.sourceRoot.updateMatrixWorld(true);
    const hip=this.sourceRoot.getObjectByName('hip_L');
    const knee=this.sourceRoot.getObjectByName('knee_L');
    const ankle=this.sourceRoot.getObjectByName('ankle_L');
    if(!hip||!knee||!ankle) throw new Error('SkeletonRigBinding: left leg landmarks missing');

    const hp=hip.getWorldPosition(new THREE.Vector3());
    const kp=knee.getWorldPosition(new THREE.Vector3());
    const ap=ankle.getWorldPosition(new THREE.Vector3());
    const thighLen=hp.distanceTo(kp);
    const shinLen=kp.distanceTo(ap);
    const side=-1;

    this.sourceRoot.traverse(o=>{
      if(!o.isMesh) return;
      const p=o.getWorldPosition(new THREE.Vector3());
      if(Math.sign(p.x)!==side) return;
      if(p.y>hp.y+thighLen*.05) return;
      if(Math.abs(p.x-hp.x)>Math.max(thighLen,shinLen)*.45) return;

      let driver='ankle_L';
      if(p.y>=kp.y-shinLen*.035) driver='hip_L';
      else if(p.y>=ap.y-shinLen*.06) driver='knee_L';
      this.bindings.push({object:o,driver});
    });

    // Semantic joint markers follow their exact rig nodes.
    this._forceDriver(hip,'hip_L');
    this._forceDriver(knee,'knee_L');
    this._forceDriver(ankle,'ankle_L');
    return this.getInfo();
  }

  _forceDriver(object,driver){
    this.bindings=this.bindings.filter(b=>b.object!==object);
    this.bindings.push({object,driver});
  }

  sync(){
    this.rig.root.updateMatrixWorld(true);
    this.sourceRoot.updateMatrixWorld(true);
    const delta=new THREE.Matrix4(),targetWorld=new THREE.Matrix4(),parentInv=new THREE.Matrix4();
    const pos=new THREE.Vector3(),quat=new THREE.Quaternion(),scale=new THREE.Vector3();

    for(const {object,driver} of this.bindings){
      const restObj=this.restWorld.get(object.uuid);
      const restDriver=this.driverRestWorld.get(driver);
      const driverNode=this.rig.getNode(driver);
      if(!restObj||!restDriver||!driverNode) continue;

      delta.copy(driverNode.matrixWorld).multiply(restDriver.clone().invert());
      targetWorld.copy(delta).multiply(restObj);
      parentInv.copy(object.parent.matrixWorld).invert();
      targetWorld.premultiply(parentInv);
      targetWorld.decompose(pos,quat,scale);
      object.position.copy(pos);
      object.quaternion.copy(quat);
      object.scale.copy(scale);
      object.updateMatrix();
    }
    this.sourceRoot.updateMatrixWorld(true);
  }

  resetVisual(){
    for(const {object} of this.bindings){
      const rest=this.restWorld.get(object.uuid); if(!rest) continue;
      const local=new THREE.Matrix4().copy(object.parent.matrixWorld).invert().multiply(rest);
      local.decompose(object.position,object.quaternion,object.scale);
      object.updateMatrix();
    }
    this.sourceRoot.updateMatrixWorld(true);
  }

  getInfo(){
    const counts={hip:0,knee:0,ankle:0};
    for(const b of this.bindings){if(b.driver==='hip_L')counts.hip++;if(b.driver==='knee_L')counts.knee++;if(b.driver==='ankle_L')counts.ankle++;}
    return {bindings:this.bindings.length,...counts};
  }
}

export function createSkeletonRigBinding(sourceRoot,rig){return new SkeletonRigBinding(sourceRoot,rig);}
