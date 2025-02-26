import
{
  Matrix4x1, Matrix4x4, Matrix4xN,
  get_rot_x, get_rot_y, get_rot_z,
  multiply4x4_4x4, multiply4x4_4xN,
  getI4x4,
  transpose4x4
} from "./matrix.js";

export { Axis, Camera }

enum Axis
{
  X = "X",
  Y = "Y",
  Z = "Z"
}

class Camera
{
  /*
  An object representing a camera by taking points in space and performing
  transformations to project their positions on an image sensor.
  */

  private camera: number; // used to prevent ducktyping

  /*
  res_x and res_y refer to the pixels spanning x & y dims of image sensors
  max_vew_angle_rad is the view angle of the camera from edge to edge
  max_view_angle refers to whichever dim is larger (i.e. portrait/landscape)
  pix_per_rad is the same for both dims
  */
  protected res_x: number;
  protected res_y: number;
  protected max_px: number;
  protected max_view_angle_rad: number;
  protected px_density: number;
  protected aspect_ratio: number;

  /*
  Distance of sensor to pinhole - automatically adapts to camera view angle.
  Similar triangles are used for image projections to make distant objects
  appear closer to vanishing point. i.e. A point displaced in the x direction
  d_x units of the camera's view axis (z) will be closer to the center of the
  image the further away that point is.
  b_x = d_x/d_z * e_z + e_x
  alpha = 2 arctan(1 / e_z) =>
  e_z = 1 / tan(0.5 * alpha)
  https://en.wikipedia.org/wiki/3D_projection#Perspective_projection
  */
  protected e_z: number;

  /*
  rot_x, rot_yp, rot_zpp refer to the intrinsic Tait-Bryan rotations to
  orient the camera away from the default orientation, which is looking
  down the corrdiante system z-axis. The p (prime), and pp indicates 
  order of compositions.
  The camera's viewing axis is z, x is width, y is height.
  inv_Rot is a rotation matrix that will reorient points relative to the
  camera. i.e. if the camera pitches up on its intinsic axis then the objects
  in view will appear to move "down" in the image.
  inv_Tra is analagous to inv_Rot but for translations.
  camera_transform is the composition of inv_Tra and inv_Rot. i.e. when
  applied to objects it finds their position relative to the camera.
  
  */

  protected swp: Matrix4x4 = new Matrix4x4();
  protected inv_rot: Matrix4x4 = new Matrix4x4();
  protected inv_tra: Matrix4x4 = new Matrix4x4();
  protected camera_transform: Matrix4x4 = new Matrix4x4();

  constructor()
  {
    /*
    This initializes the values in all member matrix arrays (to equal
    the identity matrix). The default position is at the origin of the global
    coordinates. The 1 in the fourth element indicates position is a point,
    not a vector. The use of 4-element and 4d vectors for 3d points enables
    translations. See homogeneous coordinates.
    https://en.wikipedia.org/wiki/Homogeneous_coordinates
    */

    getI4x4(this.swp.arr);
    getI4x4(this.inv_rot.arr);
    getI4x4(this.camera_transform.arr);
    getI4x4(this.inv_tra.arr);
  }

  get_res_x(): number
  {
    return this.res_x;
  }

  get_res_y(): number
  {
    return this.res_y;
  }

  get_pix_per_rad(): number
  {
    return this.px_density;
  }

  get_aspect_ratio(): number
  {
    return this.aspect_ratio;
  }

  get_view_angle(): number
  {
    return this.max_view_angle_rad;
  }

  set_pos(pos: Matrix4x1): void
  {
    /*
    Stores the camera position in a column vector and automatically updates
    inv_Tra and updates the camera transformation matrix.
    */
    this.inv_tra.arr[12] = -pos.arr[0]; // 4th column
    this.inv_tra.arr[13] = -pos.arr[1];
    this.inv_tra.arr[14] = -pos.arr[2];
    this.inv_tra.arr[15] = 1;
  }

  set_rot(x: number, yp: number, zpp: number): void
  {
    /*
    Updates the Tait-Bryan rotations angles (in radians)
    Automatically adjusts the camera transformation matrix.
    */

    /*
    inv_Rot is the composition of a rotation on the camera's intrinsic x-,
    then y-, then z- axis.
    The inverse is therefore a negative rotation of z, then y, then x.
    i.e. inv_Rot = (-X * (-Y * (-Z * I)))

    Since camera_transform must be reset after setting the inv_Rot matrix, it
    can be used as a temporary variable to speed up the composition.
    */
    get_rot_z(-zpp, this.inv_rot);

    get_rot_y(-yp, this.swp);
    multiply4x4_4x4(this.swp, this.inv_rot, this.inv_rot)

    get_rot_x(-x, this.swp);
    multiply4x4_4x4(this.swp, this.inv_rot, this.inv_rot);
  }

  update_cam_transform(): void
  {
    /*
    The camera transform is used to find the position of points/vectors relative
    to the camera.
    i.e. If the camera pitches up on its intrinsic x-axis then objects should
    appear further "down" on the sensor.

    https://en.wikipedia.org/wiki/3D_projection#Mathematical_formula
    */
    multiply4x4_4x4(this.inv_rot, this.inv_tra, this.camera_transform);
  }

  perspective_project(input: Matrix4xN, output?: Matrix4xN): Matrix4xN
  {
    /*
    output can be modified in place since this does not matrix multiply

    Performs a perspective projection.

    This is not a parallel projection. It creates the illusion of further away
    objects approaching a vanishing point.

    It uses similar triangles to map a point in space to a position on an image
    sensor.

    i.e. The position of a point in space traces to a position on the sensor by
    following the line from that point and going through the pinhole.

    The distance of the sensor from the pinhole, e_z, adapts to the desired viewing 
    angle of the camera so that the edges of the sensor coincide with the edges
    of the camera's viewing angle.

    http://csis.pace.edu/~benjamin/teaching/cs627/webfiles/vision/v.2.html

    */
    if (typeof output === 'undefined')
    {
      output = new Matrix4xN(input.cols());
    }

    let x: number;
    let y: number;
    let z: number;
    let rel_tri: number;

    if (input.cols === output.cols)
    {
      {
        let i: number;

        for (i = 0; i < input.arr.length; i += 4)
        {
          x = input.arr[i];
          y = input.arr[i + 1];
          z = input.arr[i + 2];

          rel_tri = this.e_z / z;

          // alpha = 2 arctan(1 / ez)
          // ez = 1 / tan(alpha / 2)
          // bx = ez/dz * dx + ex
          output.arr[i] = 0.5 * this.res_x + 0.5 * this.max_px * rel_tri * x;//(x / z);
          output.arr[i + 1] = 0.5 * this.res_y + 0.5 * this.max_px * rel_tri * y;//(y / z);
          output.arr[i + 2] = rel_tri;
          output.arr[i + 3] = 1;
        }
      }
    }

    return output;
  }

  capture(points: Matrix4xN, relpos?: Matrix4xN): Matrix4xN
  {
    /*
    Applies the camera transformation and persective projection to get a "view"
    of the input matrix.

    Note that perspective_project CAN modify arguments in place.
    */
    if (typeof relpos === 'undefined')
    {
      relpos = new Matrix4xN(points.cols());
    }

    multiply4x4_4xN(this.camera_transform, points, relpos);
    this.perspective_project(relpos, relpos);

    return relpos;
  }

  set_res_and_view_angle(
    new_res_x: number,
    new_res_y: number,
    new_max_view_angle_rad: number): void
  {
    /*
    Sets the resolution of the image sensor and the viewing angle of the camera.
    
    The distance of the image sensor to the pinhole, e_z, adapts st the edges of
    the sensor coincide with the edge of the camera field of view.

    Max view angle is set instead of view_angle_x and view_angle_y.
    By fixing the max view angle, on resolution changes, then as the
    aspect ration changes one of the viewing angles shrinks. This makes more
    sense then a view angle that can grow indefinitely from an arbitrary start.

    Note: Max view angle is in radians and is the angle from edge to edge.
    For a view angle that concides with a unit cube (all corners at 1) whdn the
    camera is at the origin, the max_view_angle is 2 * atan(1), not atan(2).
    */
    this.res_x = new_res_x;
    this.res_y = new_res_y;
    this.max_px = Math.max(this.res_x, this.res_y);
    this.max_view_angle_rad = new_max_view_angle_rad;
    this.aspect_ratio = new_res_x / new_res_y;

    this.e_z = 1 / Math.tan(this.max_view_angle_rad / 2);

    if (this.res_x > this.res_y)
    {
      this.px_density = (0.5 * this.res_x) / this.max_view_angle_rad;
    }
    else
    {
      this.px_density = (0.5 * this.res_y) / this.max_view_angle_rad;
    }
  }

  g_rot(A: Axis, theta: number): void
  {
    switch (A)
    {
      case Axis.X:
        get_rot_x(theta, this.swp);
        break;
      case Axis.Y:
        get_rot_y(theta, this.swp);
        break;
      case Axis.Z:
        get_rot_z(theta, this.swp);
        break;
    }

    multiply4x4_4x4(this.swp, this.inv_rot, this.inv_rot);
  }

  l_rot(A: Axis, theta: number): void
  {
    switch (A)
    {
      case Axis.X:
        get_rot_x(theta, this.swp);
        break;
      case Axis.Y:
        get_rot_y(theta, this.swp);
        break;
      case Axis.Z:
        get_rot_z(theta, this.swp);
        break;
    }
    multiply4x4_4x4(this.inv_rot, this.swp, this.swp);
    this.inv_rot.set_all(this.swp.arr);
  }

}