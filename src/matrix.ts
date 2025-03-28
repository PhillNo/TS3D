export
{
  same_view,
  Matrix, Matrix4xN, Matrix4x4, Matrix4x1,
  get_rot_x, get_rot_y, get_rot_z, get_rot_v,
  getI4x4,
  multiply, multiply4x4_4xN, multiply4x4_4x4, multiply4x4_4x1,
  dot3, norm3, cross3, transpose4x4,
  copy4xN, copy4x4, copy4x1
};

class Matrix
{
  /*
  Column major implementation of a matrix.

  Note that size cannot change.
  */

  private            matrix:    number; // stops duck typing

  protected readonly row_count: number;
  protected readonly col_count: number;
  public    readonly arr:       Float32Array;

  constructor(rows: number, cols: number, view?: Float32Array)
  {
    if ((rows < 1) || ((rows % 1.0) != 0) ||
      (cols < 1) || ((cols % 1.0) != 0))
    {
      throw "Matrix dims must be integer > 0."
    }
    else
    {
      this.row_count = rows;
      this.col_count = cols;
      if (view !== undefined)
      {
        if (view.length === (this.row_count * this.col_count))
        {
          this.arr = view;
        }
        else
        {
          throw 'Provided view length does not fit matrix dims.'
        }
      }
      else
      {
        this.arr = new Float32Array(this.row_count * this.col_count);
      }
    }
  }

  rows(): number
  {
    return this.row_count;
  }

  cols(): number
  {
    return this.col_count;
  }

  get(row: number, col: number): number
  {
    if ((row < 0) || (row >= this.row_count) ||
      (col < 0) || (col >= this.col_count))
    {
      throw "Requested element outside matrix dims.";
    }

    return this.arr[row + col * this.row_count] // column major
  }

  set(row: number, col: number, val: number): void
  {
    if ((row < 0) || (row >= this.row_count) ||
      (col < 0) || (col >= this.col_count))
    {
      throw "Requested element outside matrix dims.";
    }

    this.arr[row + col * this.row_count] = val; // column major
  }

  set_column(column: number, values: number[] | Float32Array): void
  {
    if ((this.row_count != values.length) ||
      (column >= this.col_count))
    {
      throw `Requested column outside matrix dims or
                column vec dims do not match.`;
    }

    {
      let i: number;
      for (i = 0; i < this.row_count; ++i)
      {
        this.arr[i + column * this.row_count] = values[i];
      }
    }
  }

  set_all(vals: number[] | Float32Array): void
  {
    /*
    Sets all elements of the matrix.
    Provided list expected to be packed column major order.
    */
    if (vals.length !== (this.row_count * this.col_count))
    {
      throw "Provided vals length does not match matrix size.";
    }
    else
    {
      {
        let i: number;
        for (i = 0; i < vals.length; ++i)
        {
          this.arr[i] = vals[i];
        }
      }
    }
  }

}

class Matrix4xN extends Matrix
{
  private         matrix4xN: number; // stops duck typing

  static readonly row_count: number = 4;

  constructor(cols: number, view?: Float32Array)
  {
    if ((cols <= 0) || ((cols % 1) !== 0))
    {
      throw "Matrix4xN must have positive integer number of cols."
    }
    else
    {
      super(4, cols, view);
    }
  }
}

class Matrix4x4 extends Matrix4xN
{
  private         matrix4x4: number; // stops duck typing
  static readonly row_count: number = 4;
  static readonly col_count: number = 4;

  constructor(view?: Float32Array)
  {
    super(4, view);
  }

}

class Matrix4x1 extends Matrix4xN
{
  private         matrix4x1: number; // stops duck typing
  static readonly row_count: number = 4;
  static readonly col_count: number = 1;

  constructor(view?: Float32Array)
  {
    super(1, view);
  }
}

function same_view(A: ArrayBufferView, B: ArrayBufferView): boolean
{
  if (
    A.buffer === B.buffer &&
    A.byteOffset === B.byteOffset &&
    A.byteLength === B.byteLength
  )
  {
    return true;
  }

  return false;
}

function dot3(A: Matrix4x1, B: Matrix4x1): number
{
  return A.arr[0] * B.arr[0] + A.arr[1] * B.arr[1] + A.arr[2] * B.arr[2];
}

function norm3(A: Matrix4x1): number
{
  return Math.hypot(A.arr[0], A.arr[1], A.arr[2]);
}

function cross3(A: Matrix4x1, B: Matrix4x1, C?: Matrix4x1): Matrix4x1
{
  if (typeof C === 'undefined')
  {
    C = new Matrix4x1();
  }

  C.arr[0] = (A.arr[1] * B.arr[2]) - (A.arr[2] * B.arr[1]);
  C.arr[1] = (A.arr[2] * B.arr[0]) - (A.arr[0] * B.arr[2]);
  C.arr[2] = (A.arr[0] * B.arr[1]) - (A.arr[1] * B.arr[0]);
  C.arr[3] = 0;

  return C;
}

function get_rot_x(rad: number, out?: Matrix4x4): Matrix4x4
{
  if (typeof out === 'undefined')
  {
    out = new Matrix4x4();
  }

  /*
  Overwrites `out` with the values to become a rotation matrix about axis.
  */
  let c: number = Math.cos(rad);
  let s: number = Math.sin(rad);

  out.arr[0] = 1;
  out.arr[1] = 0;
  out.arr[2] = 0;
  out.arr[3] = 0;

  out.arr[4] = 0;
  out.arr[5] = c;
  out.arr[6] = s;
  out.arr[7] = 0;

  out.arr[8] = 0;
  out.arr[9] = -s;
  out.arr[10] = c;
  out.arr[11] = 0;

  out.arr[12] = 0;
  out.arr[13] = 0;
  out.arr[14] = 0;
  out.arr[15] = 1;

  return out;
}

function get_rot_y(rad: number, out?: Matrix4x4): Matrix4x4
{
  if (typeof out === 'undefined')
  {
    out = new Matrix4x4();
  }

  /*
  Overwrites `out` with the values to become a rotation matrix about axis.
  */
  let c: number = Math.cos(rad);
  let s: number = Math.sin(rad);

  out.arr[0] = c;
  out.arr[1] = 0;
  out.arr[2] = -s;
  out.arr[3] = 0;

  out.arr[4] = 0;
  out.arr[5] = 1;
  out.arr[6] = 0;
  out.arr[7] = 0;

  out.arr[8] = s;
  out.arr[9] = 0;
  out.arr[10] = c;
  out.arr[11] = 0;

  out.arr[12] = 0;
  out.arr[13] = 0;
  out.arr[14] = 0;
  out.arr[15] = 1;

  return out;
}

function get_rot_z(rad: number, out?: Matrix4x4): Matrix4x4
{
  if (typeof out === 'undefined')
  {
    out = new Matrix4x4();
  }

  /*
  Overwrites `out` with the values to become a rotation matrix about axis.
  */
  let c: number = Math.cos(rad);
  let s: number = Math.sin(rad);

  out.arr[0] = c;
  out.arr[1] = s;
  out.arr[2] = 0;
  out.arr[3] = 0;

  out.arr[4] = -s;
  out.arr[5] = c;
  out.arr[6] = 0;
  out.arr[7] = 0;

  out.arr[8] = 0;
  out.arr[9] = 0;
  out.arr[10] = 1;
  out.arr[11] = 0;

  out.arr[12] = 0;
  out.arr[13] = 0;
  out.arr[14] = 0;
  out.arr[15] = 1;

  return out;
}

function get_rot_v(radians: number, v: Matrix4x1, C?: Matrix4x4): Matrix4x4
{

  // TODO: Find analytic solution to composition of matrices instead of sequentially composing

  if (typeof C === 'undefined')
  {
    C = new Matrix4x4();
  }

  // Rotate the space about x so that v lies on XZ plane
  // Rotate the space about y so that v lies parallel to Z axis
  // Rotate about Z axis
  // Apply inverse of step 2
  // Apply inverse of step 1

  let cumulative: Matrix4x4;
  let vnorm: number;
  let v_unit: Matrix4x1;

  let tmp_mat: Matrix4x4;
  let tmp_vec: Matrix4x1;
  let z_unit: Matrix4x1;

  let theta_x: number;
  let theta_y: number;
  
  let R_x: Matrix4x4;
  let R_x_i: Matrix4x4;

  let R_y: Matrix4x4;
  let R_y_i: Matrix4x4;

  vnorm = norm3(v);
  v_unit = copy4x1(v);
  v_unit.arr[0] /= vnorm;
  v_unit.arr[1] /= vnorm;
  v_unit.arr[2] /= vnorm;

  // rotate about X by angle between z-axis and projection of v onto YZ plane.
  
  // z-axis
  z_unit = new Matrix4x1(new Float32Array([0, 0, 1, 0]));

  // projection of v_unit onto YZ plane
  tmp_vec = copy4x1(v_unit);
  tmp_vec.arr[0] = 0;

  // angle between projection on YZ and z-axis
  theta_x = Math.acos( dot3(tmp_vec, z_unit) / norm3(tmp_vec) );

  // get matrix for rotating space about x-axis
  R_x = get_rot_x(theta_x);

  // inverse rotation only needs to change signature on 2 elements
  R_x_i = copy4x4(R_x);
  R_x.arr[6] = -1 * R_x.arr[6];
  R_x.arr[9] = -1 * R_x.arr[9];

  // projection of v rotated onto XZ plane
  multiply4x4_4x1(R_x, v_unit, tmp_vec);
  
  // angle between projection of (v_unit on YZ after rotation about x) and z-axis
  theta_y = Math.acos( dot3(tmp_vec, z_unit) / norm3(tmp_vec) ); // norm(tmp_vB) = 1, therefore omitted

  // get matrix for rotating space about y-axis
  R_y = get_rot_y(theta_y);
  // inverse rotation only needs to change signature on 2 elements
  R_y_i = copy4x4(R_y);
  R_y_i.arr[2] = -1 * R_y_i.arr[2];
  R_y_i.arr[8] = -1 * R_y_i.arr[8];


  // apply rotations
  cumulative = getI4x4();
  tmp_mat = new Matrix4x4();

  //// spatial
  multiply4x4_4x4(R_x, cumulative, cumulative);
  multiply4x4_4x4(R_y, cumulative, cumulative);
  
  // Z rotation
  multiply4x4_4x4(get_rot_z(radians), cumulative, cumulative);
  
  // unwind spatial
  multiply4x4_4x4(R_y_i, cumulative, cumulative);
  multiply4x4_4x4(R_x_i, cumulative, cumulative);

  copy4x4(cumulative, C);

  return C;
}

function getI4x4(view?: Float32Array): Matrix4x4
{
  // creates a new I matrix or overwrites a matrix in place.
  //TODO: This should just take an optional 4x4 matrix parameter
  let out = new Matrix4x4(view) // Automatically tests that length of view is 16.

  out.set_all(
    [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]
  )

  return out
}

function multiply(A: Matrix, B: Matrix, C?: Matrix): Matrix
{
  /*
  Multiplies matrix A by matrix B and stores results in matrix C.

  Note that args A and B cannot be modified in place. i.e. the results of
  A*B cannot be stored in the variable B for this generic multiply() fun
  */

  if (typeof C === 'undefined')
  {
    C = new Matrix(A.rows(), B.cols());
  }

  let swp: number = 0;

  if (same_view(A.arr, C.arr) || same_view(B.arr, C.arr))
  {
    throw "Cannot modify Matrix arg in place.";
  }

  if (A.cols() != B.rows() || A.rows() != C.rows() || B.cols() != C.cols())
  {
    throw "matrix dims incorrect - cannot multiply"
  }

  // C_ij = Sum_k(A_ik * B_kj)
  {
    let row: number;
    let col: number;
    let k: number;
    for (row = 0; row < A.rows(); ++row)
    {
      for (col = 0; col < B.cols(); ++col)
      {
        swp = 0;
        for (k = 0; k < A.cols(); ++k)
        {
          swp += A.get(row, k) * B.get(k, col);
        }
        C.set(row, col, swp);
      }
    }
  }

  return C;
}

function multiply4x4_4xN(A: Matrix4x4, B: Matrix4xN, C?: Matrix4xN): Matrix4xN
{
  /*
  Optimization of multiply when A and B have 4 rows.
  
  Note: If C is built on a reference to the same Float32Array as B
  in-place multiplication of B can be achieved
  */
  
  if (typeof C === 'undefined')
  {
    C = new Matrix4xN(B.cols());
  }

  let swp = new Float32Array(4);

  if (same_view(A.arr, C.arr))
  {
    throw "Cannot modify Matrix A in place, only B can be modified in place";
  }

  if (B.cols() !== C.cols())
  {
    throw "Matrices B and C must have same column count"
  }


  // Multiplies A by each column of B.
  {
    let offset: number
    for (offset = 0; offset < B.arr.length; offset += 4)
    {
      swp[0] = A.arr[0] * B.arr[offset + 0] + A.arr[4] * B.arr[offset + 1] + A.arr[8]  * B.arr[offset + 2] + A.arr[12] * B.arr[offset + 3];
      swp[1] = A.arr[1] * B.arr[offset + 0] + A.arr[5] * B.arr[offset + 1] + A.arr[9]  * B.arr[offset + 2] + A.arr[13] * B.arr[offset + 3];
      swp[2] = A.arr[2] * B.arr[offset + 0] + A.arr[6] * B.arr[offset + 1] + A.arr[10] * B.arr[offset + 2] + A.arr[14] * B.arr[offset + 3];
      swp[3] = A.arr[3] * B.arr[offset + 0] + A.arr[7] * B.arr[offset + 1] + A.arr[11] * B.arr[offset + 2] + A.arr[15] * B.arr[offset + 3];

      C.arr[offset]     = swp[0];
      C.arr[offset + 1] = swp[1];
      C.arr[offset + 2] = swp[2];
      C.arr[offset + 3] = swp[3];
    }
  }

  return C;
}

function multiply4x4_4x4(A: Matrix4x4, B: Matrix4x4, C?: Matrix4x4): Matrix4x4
{

  /*
  Optimization of multiply when A and B have 4 rows.

  Note: If C is built on a reference to the same Float32Array as B
        in-place multiplication of B can be achieved
  */

  if (typeof C === 'undefined')
  {
    C = new Matrix4x4();
  }

  let swp = new Float32Array(4);

  if (same_view(A.arr, C.arr))
  {
    throw "Cannot modify Matrix A in place, only B can be modified in place";
  }

  //Column 0
  swp[0] = A.arr[0] * B.arr[0] + A.arr[4] * B.arr[1] + A.arr[8]  * B.arr[2] + A.arr[12] * B.arr[3];  // row 1
  swp[1] = A.arr[1] * B.arr[0] + A.arr[5] * B.arr[1] + A.arr[9]  * B.arr[2] + A.arr[13] * B.arr[3];  // row 2
  swp[2] = A.arr[2] * B.arr[0] + A.arr[6] * B.arr[1] + A.arr[10] * B.arr[2] + A.arr[14] * B.arr[3];  // row 3
  swp[3] = A.arr[3] * B.arr[0] + A.arr[7] * B.arr[1] + A.arr[11] * B.arr[2] + A.arr[15] * B.arr[3];  // row 4

  C.arr[0] = swp[0];
  C.arr[1] = swp[1];
  C.arr[2] = swp[2];
  C.arr[3] = swp[3];

  //Column 1
  swp[0] = A.arr[0] * B.arr[4] + A.arr[4] * B.arr[5] + A.arr[8]  * B.arr[6] + A.arr[12] * B.arr[7];  // row 1
  swp[1] = A.arr[1] * B.arr[4] + A.arr[5] * B.arr[5] + A.arr[9]  * B.arr[6] + A.arr[13] * B.arr[7];  // row 2
  swp[2] = A.arr[2] * B.arr[4] + A.arr[6] * B.arr[5] + A.arr[10] * B.arr[6] + A.arr[14] * B.arr[7];  // row 3
  swp[3] = A.arr[3] * B.arr[4] + A.arr[7] * B.arr[5] + A.arr[11] * B.arr[6] + A.arr[15] * B.arr[7];  // row 4

  C.arr[4] = swp[0];
  C.arr[5] = swp[1];
  C.arr[6] = swp[2];
  C.arr[7] = swp[3];

  //Column 2
  swp[0] = A.arr[0] * B.arr[8] + A.arr[4] * B.arr[9] + A.arr[8]  * B.arr[10] + A.arr[12] * B.arr[11]; // row 1
  swp[1] = A.arr[1] * B.arr[8] + A.arr[5] * B.arr[9] + A.arr[9]  * B.arr[10] + A.arr[13] * B.arr[11]; // row 2
  swp[2] = A.arr[2] * B.arr[8] + A.arr[6] * B.arr[9] + A.arr[10] * B.arr[10] + A.arr[14] * B.arr[11]; // row 3
  swp[3] = A.arr[3] * B.arr[8] + A.arr[7] * B.arr[9] + A.arr[11] * B.arr[10] + A.arr[15] * B.arr[11]; // row 4


  C.arr[8] = swp[0];
  C.arr[9] = swp[1];
  C.arr[10] = swp[2];
  C.arr[11] = swp[3];


  //Column 3
  swp[0] = A.arr[0] * B.arr[12] + A.arr[4] * B.arr[13] + A.arr[8]  * B.arr[14] + A.arr[12] * B.arr[15]; // row 1
  swp[1] = A.arr[1] * B.arr[12] + A.arr[5] * B.arr[13] + A.arr[9]  * B.arr[14] + A.arr[13] * B.arr[15]; // row 2
  swp[2] = A.arr[2] * B.arr[12] + A.arr[6] * B.arr[13] + A.arr[10] * B.arr[14] + A.arr[14] * B.arr[15]; // row 3
  swp[3] = A.arr[3] * B.arr[12] + A.arr[7] * B.arr[13] + A.arr[11] * B.arr[14] + A.arr[15] * B.arr[15]; // row 4

  C.arr[12] = swp[0];
  C.arr[13] = swp[1];
  C.arr[14] = swp[2];
  C.arr[15] = swp[3];

  return C;
}

function multiply4x4_4x1(A: Matrix4x4, B: Matrix4x1, C?: Matrix4x1): Matrix4x1
{
  /*
  Optimization of multiply in the case `A` is dim 4,4 and `B` is dim 4,1.

  Note: If C is built on a reference to the same Float32Array as B
        in-place multiplication of B can be achieved
  */

  if (typeof C === 'undefined')
  {
    C = new Matrix4x1();
  }

  let swp = new Float32Array(4);

  if (same_view(A.arr, C.arr))
  {
    throw "Cannot modify Matrix A in place, only B can be modified in place";
  }

  //Column 0
  swp[0] = A.arr[0] * B.arr[0] + A.arr[4] * B.arr[1] + A.arr[8]  * B.arr[2] + A.arr[12] * B.arr[3];  // row 1
  swp[1] = A.arr[1] * B.arr[0] + A.arr[5] * B.arr[1] + A.arr[9]  * B.arr[2] + A.arr[13] * B.arr[3];  // row 2
  swp[2] = A.arr[2] * B.arr[0] + A.arr[6] * B.arr[1] + A.arr[10] * B.arr[2] + A.arr[14] * B.arr[3];  // row 3
  swp[3] = A.arr[3] * B.arr[0] + A.arr[7] * B.arr[1] + A.arr[11] * B.arr[2] + A.arr[15] * B.arr[3];  // row 4

  C.arr[0] = swp[0];
  C.arr[1] = swp[1];
  C.arr[2] = swp[2];
  C.arr[3] = swp[3];

  return C;
}

function transpose4x4(A: Matrix4x4, C?: Matrix4x4): void
{
  if (C === undefined || same_view(A.arr, C.arr)) // Testing for in-place transpose. Must test if `C` arg provided.
  {
    let swp: Matrix4x4 = new Matrix4x4();

    swp.arr[0]  = A.arr[0];
    swp.arr[1]  = A.arr[4];
    swp.arr[2]  = A.arr[8];
    swp.arr[3]  = A.arr[12];
    swp.arr[4]  = A.arr[1];
    swp.arr[5]  = A.arr[5];
    swp.arr[6]  = A.arr[9];
    swp.arr[7]  = A.arr[13];
    swp.arr[8]  = A.arr[2];
    swp.arr[9]  = A.arr[6];
    swp.arr[10] = A.arr[10];
    swp.arr[11] = A.arr[14];
    swp.arr[12] = A.arr[3];
    swp.arr[13] = A.arr[7];
    swp.arr[14] = A.arr[11];
    swp.arr[15] = A.arr[15];

    A.set_all(swp.arr);
  }
  else
  {
    C.arr[0]  = A.arr[0];
    C.arr[1]  = A.arr[4];
    C.arr[2]  = A.arr[8];
    C.arr[3]  = A.arr[12];
    C.arr[4]  = A.arr[1];
    C.arr[5]  = A.arr[5];
    C.arr[6]  = A.arr[9];
    C.arr[7]  = A.arr[13];
    C.arr[8]  = A.arr[2];
    C.arr[9]  = A.arr[6];
    C.arr[10] = A.arr[10];
    C.arr[11] = A.arr[14];
    C.arr[12] = A.arr[3];
    C.arr[13] = A.arr[7];
    C.arr[14] = A.arr[11];
    C.arr[15] = A.arr[15];
  }
}

function copy4xN(src: Matrix4xN, dst?: Matrix4xN): Matrix4xN
{
  if (typeof dst === 'undefined')
  {
    dst = new Matrix4xN(src.cols());
  }
  else if (dst.cols() !== src.cols())
  {
    throw "Provided dst dims do not match src dims"
  }

  let index;

  for (index = 0; index < src.arr.length; ++index)
  {
    dst.arr[index] = src.arr[index];
  }

  return dst;

}

function copy4x4(src: Matrix4x4, dst?: Matrix4x4): Matrix4x4
{
  if (typeof dst === 'undefined')
  {
    dst = new Matrix4x4();
  }

  let index;

  for (index = 0; index < src.arr.length; ++index)
  {
    dst.arr[index] = src.arr[index];
  }

  return dst;
}

function copy4x1(src: Matrix4x1, dst?: Matrix4x1): Matrix4x1
{
  if (typeof dst === 'undefined')
  {
    dst = new Matrix4x1();
  }

  let index;

  for (index = 0; index < src.arr.length; ++index)
  {
    dst.arr[index] = src.arr[index];
  }

  return dst;
}
