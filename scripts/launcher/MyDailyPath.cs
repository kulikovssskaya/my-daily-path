using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Threading;
using System.Windows.Forms;

class MyDailyPath
{
    const string AppUrl = "http://localhost:3000";
    const string ScheduleUrl = "http://localhost:3000/schedule";
    const string AppModelId = "MyDailyPath.DailyPath";

    static string ProjectRoot;
    static string EdgeProfileDir;

    static int Main()
    {
        try
        {
            ProjectRoot = ResolveProjectRoot();
            if (ProjectRoot == null)
            {
                MessageBox.Show(
                    "Keep MyDailyPath.exe in the project folder.",
                    "My Daily Path",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
                return 1;
            }

            EdgeProfileDir = Path.Combine(ProjectRoot, ".edge-app-data");
            Directory.CreateDirectory(EdgeProfileDir);

            if (!IsServerRunning())
            {
                if (!EnsureDevServerSupervisor())
                {
                    return 1;
                }

                if (!WaitForServer(90))
                {
                    MessageBox.Show(
                        "Server did not start on port 3000 in 90 seconds.\n" +
                        "Check the PowerShell window titled dev server.\n" +
                        "Log: dev-server.log",
                        "My Daily Path",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);
                    return 1;
                }
            }

            var edge = FindEdge();
            if (edge == null)
            {
                Process.Start(new ProcessStartInfo { FileName = ScheduleUrl, UseShellExecute = true });
                return 0;
            }

            var args = "--app=" + ScheduleUrl +
                       " --app-user-model-id=" + AppModelId +
                       " --user-data-dir=\"" + EdgeProfileDir + "\"";

            Process.Start(new ProcessStartInfo
            {
                FileName = edge,
                Arguments = args,
                UseShellExecute = true,
            });
            return 0;
        }
        catch (Exception ex)
        {
            MessageBox.Show("Failed to open:\n\n" + ex.Message, "My Daily Path",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return 1;
        }
    }

    static string ResolveProjectRoot()
    {
        var exeDir = Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        if (string.IsNullOrEmpty(exeDir)) return null;

        foreach (var dir in new[] { exeDir, Path.GetFullPath(Path.Combine(exeDir, "..")) })
        {
            if (File.Exists(Path.Combine(dir, "package.json"))) return dir;
        }
        return null;
    }

    static bool IsServerRunning()
    {
        try
        {
            var req = (HttpWebRequest)WebRequest.Create(AppUrl);
            req.Method = "GET";
            req.Timeout = 3000;
            using (var res = (HttpWebResponse)req.GetResponse())
            {
                return (int)res.StatusCode >= 200;
            }
        }
        catch { return false; }
    }

    static bool IsSupervisorRunning()
    {
        var lockFile = Path.Combine(ProjectRoot, ".data", "dev-server.lock");
        if (!File.Exists(lockFile)) return false;

        var text = File.ReadAllText(lockFile).Trim();
        int pid;
        if (!int.TryParse(text, out pid)) return false;

        try
        {
            var proc = Process.GetProcessById(pid);
            return proc.ProcessName.IndexOf("powershell", StringComparison.OrdinalIgnoreCase) >= 0;
        }
        catch
        {
            return false;
        }
    }

    static bool WaitForServer(int timeoutSec)
    {
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSec);
        while (DateTime.UtcNow < deadline)
        {
            if (IsServerRunning()) return true;
            Thread.Sleep(1500);
        }
        return false;
    }

    static bool EnsureDevServerSupervisor()
    {
        if (IsSupervisorRunning())
        {
            return true;
        }

        var script = Path.Combine(ProjectRoot, "scripts", "run-dev-server.ps1");
        if (!File.Exists(script))
        {
            MessageBox.Show(
                "Missing scripts\\run-dev-server.ps1 in the project folder.",
                "My Daily Path",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return false;
        }

        var psArgs = "-NoExit -NoProfile -ExecutionPolicy Bypass -File \"" + script + "\"";

        Process.Start(new ProcessStartInfo
        {
            FileName = "powershell.exe",
            Arguments = psArgs,
            WorkingDirectory = ProjectRoot,
            UseShellExecute = true,
        });
        return true;
    }

    static string FindEdge()
    {
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        foreach (var p in new[]
        {
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
            Path.Combine(local, "Microsoft", "Edge", "Application", "msedge.exe"),
        })
            if (File.Exists(p)) return p;
        return null;
    }
}
