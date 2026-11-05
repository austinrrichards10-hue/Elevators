// Frostmourne: a one-file launcher. The whole game is packed inside this program. The first
// time it runs (or when it's a newer version), it unpacks the game into a "Frostmourne" folder
// next to itself, then opens it in its own window. The player's phone wallpapers
// in that folder are never touched.
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Windows.Forms;

static class Launcher
{
    const string Version = "__VERSION__";

    [STAThread]
    static void Main()
    {
        try
        {
            string here = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
            string root = Path.Combine(here, "Frostmourne");
            string stamp = Path.Combine(root, "version.txt");
            string index = Path.Combine(root, "index.html");
            bool fresh = !File.Exists(index) || !File.Exists(stamp) || File.ReadAllText(stamp).Trim() != Version;
            if (fresh) Unpack(root, stamp);
            Open(index);
        }
        catch (Exception e)
        {
            MessageBox.Show("Frostmourne couldn't start:\n\n" + e.Message, "Frostmourne", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    static void Unpack(string root, string stamp)
    {
        Directory.CreateDirectory(root);
        string full = Path.GetFullPath(root) + Path.DirectorySeparatorChar;
        using (Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream("game.zip"))
        using (ZipArchive zip = new ZipArchive(s, ZipArchiveMode.Read))
        {
            foreach (ZipArchiveEntry e in zip.Entries)
            {
                string path = Path.GetFullPath(Path.Combine(root, e.FullName));
                if (!path.StartsWith(full, StringComparison.OrdinalIgnoreCase)) continue;
                if (e.FullName.EndsWith("/") || e.Name.Length == 0) { Directory.CreateDirectory(path); continue; }
                // The player's own pictures stay as they are.
                bool userFolder = e.FullName.StartsWith("phone-wallpapers/");
                if (userFolder && File.Exists(path)) continue;
                Directory.CreateDirectory(Path.GetDirectoryName(path));
                e.ExtractToFile(path, true);
            }
        }
        File.WriteAllText(stamp, Version);
    }

    // Its own window: Edge (or Chrome) in app mode, maximised; otherwise the default browser.
    static void Open(string index)
    {
        string url = new Uri(index).AbsoluteUri;
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] browsers = {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
        };
        foreach (string b in browsers)
        {
            if (!File.Exists(b)) continue;
            Process.Start(new ProcessStartInfo(b, "--app=\"" + url + "\" --start-maximized --autoplay-policy=no-user-gesture-required") { UseShellExecute = false });
            return;
        }
        Process.Start(new ProcessStartInfo(index) { UseShellExecute = true });
    }
}
