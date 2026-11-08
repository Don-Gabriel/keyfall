using System;
using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

[assembly: AssemblyTitle("Keyfall")]
[assembly: AssemblyDescription("Local piano practice")]
[assembly: AssemblyProduct("Keyfall")]
[assembly: AssemblyVersion("0.5.0.0")]
[assembly: AssemblyFileVersion("0.5.0.0")]

internal static class KeyfallLauncher
{
    [STAThread]
    private static void Main()
    {
        try
        {
            string folder = AppDomain.CurrentDomain.BaseDirectory;
            string runtime = Path.Combine(folder, "runtime", "node.exe");
            string script = Path.Combine(folder, "Start-Keyfall.mjs");
            if (!File.Exists(runtime) || !File.Exists(script))
                throw new InvalidOperationException("Keyfall's runtime is missing. Please reinstall Keyfall.");

            ProcessStartInfo info = new ProcessStartInfo(runtime, "\"" + script + "\"");
            info.WorkingDirectory = folder;
            info.UseShellExecute = false;
            info.CreateNoWindow = true;
            info.WindowStyle = ProcessWindowStyle.Hidden;
            info.RedirectStandardError = true;
            info.RedirectStandardOutput = true;
            using (Process process = Process.Start(info))
            {
                string error = process.StandardError.ReadToEnd();
                process.WaitForExit();
                if (process.ExitCode != 0)
                    throw new InvalidOperationException(String.IsNullOrWhiteSpace(error) ? "The local piano app could not start." : error.Trim());
            }
        }
        catch (Exception error)
        {
            MessageBox.Show(error.Message, "Keyfall could not start", MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}


