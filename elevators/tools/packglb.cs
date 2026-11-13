// Packs a textured GLB (static meshes, one material) into a JS file the game can load straight
// from the folder, at full detail: every triangle and the original textures are kept. Only data
// the renderer doesn't use (tangents, extra UV sets) is dropped. Positions are normalised so the
// model stands with its feet on y = 0, centred, at the given height.
//   packglb.exe <in.glb> <out.js> <varName> [heightMetres]
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Text;
using System.Web.Script.Serialization;

static class PackGlb
{
    static byte[] file;
    static int binStart;
    static Dictionary<string, object> json;

    static object[] Arr(object o, string k) { return (object[])((Dictionary<string, object>)o)[k]; }
    static Dictionary<string, object> Obj(object o) { return (Dictionary<string, object>)o; }
    static int Int(object o) { return Convert.ToInt32(o); }

    static float[] Floats(int accessor, int size)
    {
        var a = Obj(Arr(json, "accessors")[accessor]);
        var bv = Obj(Arr(json, "bufferViews")[Int(a["bufferView"])]);
        int count = Int(a["count"]);
        int start = binStart + (bv.ContainsKey("byteOffset") ? Int(bv["byteOffset"]) : 0) + (a.ContainsKey("byteOffset") ? Int(a["byteOffset"]) : 0);
        int stride = bv.ContainsKey("byteStride") ? Int(bv["byteStride"]) : size * 4;
        var o = new float[count * size];
        for (int i = 0; i < count; i++)
            for (int c = 0; c < size; c++)
                o[i * size + c] = BitConverter.ToSingle(file, start + i * stride + c * 4);
        return o;
    }

    static int[] Indices(int accessor)
    {
        var a = Obj(Arr(json, "accessors")[accessor]);
        var bv = Obj(Arr(json, "bufferViews")[Int(a["bufferView"])]);
        int count = Int(a["count"]);
        int start = binStart + (bv.ContainsKey("byteOffset") ? Int(bv["byteOffset"]) : 0) + (a.ContainsKey("byteOffset") ? Int(a["byteOffset"]) : 0);
        int ct = Int(a["componentType"]);
        var o = new int[count];
        for (int i = 0; i < count; i++)
            o[i] = ct == 5125 ? (int)BitConverter.ToUInt32(file, start + i * 4) : ct == 5123 ? BitConverter.ToUInt16(file, start + i * 2) : file[start + i];
        return o;
    }

    static void Main(string[] args)
    {
        string inPath = args[0], outPath = args[1], varName = args[2];
        double height = args.Length > 3 ? double.Parse(args[3], CultureInfo.InvariantCulture) : 1.58;
        file = File.ReadAllBytes(inPath);
        int jsonLen = BitConverter.ToInt32(file, 12);
        json = (Dictionary<string, object>)new JavaScriptSerializer { MaxJsonLength = int.MaxValue }.DeserializeObject(Encoding.UTF8.GetString(file, 20, jsonLen));
        binStart = 20 + jsonLen + 8;

        var prims = new List<Dictionary<string, object>>();
        foreach (var mesh in Arr(json, "meshes"))
            foreach (var prim in Arr(mesh, "primitives")) prims.Add(Obj(prim));

        // Bounds over every primitive, for normalising.
        var pos = new List<float[]>();
        double[] mn = { double.MaxValue, double.MaxValue, double.MaxValue }, mx = { double.MinValue, double.MinValue, double.MinValue };
        foreach (var p in prims)
        {
            var a = Floats(Int(Obj(p["attributes"])["POSITION"]), 3);
            pos.Add(a);
            for (int i = 0; i < a.Length; i++) { mn[i % 3] = Math.Min(mn[i % 3], a[i]); mx[i % 3] = Math.Max(mx[i % 3], a[i]); }
        }
        double scale = height / (mx[1] - mn[1]);
        double cx = (mn[0] + mx[0]) / 2, cz = (mn[2] + mx[2]) / 2;

        var blob = new MemoryStream();
        Action align = () => { while (blob.Length % 4 != 0) blob.WriteByte(0); };
        Func<float[], int> writeFloats = (arr) => { align(); int off = (int)blob.Length; var b = new byte[arr.Length * 4]; Buffer.BlockCopy(arr, 0, b, 0, b.Length); blob.Write(b, 0, b.Length); return off; };

        var meta = new StringBuilder("{\"height\":" + height.ToString(CultureInfo.InvariantCulture) + ",\"prims\":[");
        for (int k = 0; k < prims.Count; k++)
        {
            var attrs = Obj(prims[k]["attributes"]);
            var p = pos[k];
            for (int i = 0; i < p.Length; i += 3)
            {
                p[i] = (float)((p[i] - cx) * scale);
                p[i + 1] = (float)((p[i + 1] - mn[1]) * scale);
                p[i + 2] = (float)((p[i + 2] - cz) * scale);
            }
            int vcount = p.Length / 3;
            int oPos = writeFloats(p);
            int oNor = writeFloats(Floats(Int(attrs["NORMAL"]), 3));
            int oUv0 = writeFloats(Floats(Int(attrs["TEXCOORD_0"]), 2));
            int oUv1 = attrs.ContainsKey("TEXCOORD_1") ? writeFloats(Floats(Int(attrs["TEXCOORD_1"]), 2)) : -1;
            var idx = Indices(Int(prims[k]["indices"]));
            align();
            int oIdx = (int)blob.Length;
            bool small = vcount <= 65536;
            foreach (int i in idx) { var b = small ? BitConverter.GetBytes((ushort)i) : BitConverter.GetBytes((uint)i); blob.Write(b, 0, b.Length); }
            if (k > 0) meta.Append(',');
            meta.AppendFormat("{{\"vcount\":{0},\"icount\":{1},\"pos\":{2},\"nor\":{3},\"uv0\":{4},\"uv1\":{5},\"idx\":{6},\"idx32\":{7}}}", vcount, idx.Length, oPos, oNor, oUv0, oUv1, oIdx, small ? "false" : "true");
        }
        meta.Append("],\"textures\":{");

        // The material's textures, as the original image files.
        var mat = Obj(Arr(json, "materials")[0]);
        var pbr = Obj(mat["pbrMetallicRoughness"]);
        bool first = true;
        foreach (var slot in new[] { "baseColorTexture", "metallicRoughnessTexture" })
        {
            if (!pbr.ContainsKey(slot)) continue;
            var info = Obj(pbr[slot]);
            var tex = Obj(Arr(json, "textures")[Int(info["index"])]);
            var img = Obj(Arr(json, "images")[Int(tex["source"])]);
            var bv = Obj(Arr(json, "bufferViews")[Int(img["bufferView"])]);
            int start = binStart + (bv.ContainsKey("byteOffset") ? Int(bv["byteOffset"]) : 0), len = Int(bv["byteLength"]);
            int off = (int)blob.Length;
            blob.Write(file, start, len);
            align();
            if (!first) meta.Append(',');
            first = false;
            meta.AppendFormat("\"{0}\":{{\"off\":{1},\"len\":{2},\"mime\":\"{3}\",\"uv\":{4}}}", slot, off, len, img["mime" + "Type"], info.ContainsKey("texCoord") ? Int(info["texCoord"]) : 0);
        }
        meta.Append("}}");

        using (var w = new StreamWriter(outPath, false, new UTF8Encoding(false)))
        {
            w.WriteLine("// Generated by tools/packglb.cs from " + Path.GetFileName(inPath) + ". Full detail. Do not edit by hand.");
            w.Write("window." + varName + " = { meta: " + meta + ", data: \"");
            w.Write(Convert.ToBase64String(blob.ToArray()));
            w.WriteLine("\" };");
        }
        Console.WriteLine("packed " + prims.Count + " primitives, " + blob.Length / 1048576.0 + " MB -> " + outPath);
    }
}
