import os
import subprocess
import tkinter as tk
from tkinter import ttk, messagebox
import socket
import psutil

DISK_DIR = ".\\disk_images"
ISO_PATH = ".\\iso\\alpine-virt-3.21.3-x86.iso"

# List to track running VM processes and their VNC ports
vm_processes = []  
used_vnc_ports = []  

def clean_orphaned_processes():
    """Terminate orphaned QEMU processes and clear their ports."""
    for proc in psutil.process_iter(['name', 'pid']):
        if proc.info['name'].lower() == 'qemu-system-x86_64.exe':
            try:
                proc.terminate()
                proc.wait(timeout=5)
            except (psutil.TimeoutExpired, psutil.NoSuchProcess, psutil.AccessDenied):
                proc.kill()
            except Exception as e:
                print(f"Error terminating QEMU process {proc.pid}: {e}")

def is_port_free(port):
    """Check if a port is free."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(1)
        try:
            s.bind(("localhost", port))
            return True
        except socket.error:
            return False

def create_virtual_disk(format, size, name):
    """Create a virtual disk using qemu-img."""
    extensions = {
        "qcow2": ".qcow2",
        "raw": ".raw",
        "vdi": ".vdi",
        "vmdk": ".vmdk",
        "vhdx": ".vhdx"
    }
    if not name.endswith(extensions[format]):
        name += extensions[format]
    path = os.path.join(DISK_DIR, name)
    cmd = ["qemu-img", "create", "-f", format, path, size]
    try:
        subprocess.run(cmd, check=True, shell=True)
        messagebox.showinfo("Success", f"Disk {name} created successfully.")
    except subprocess.CalledProcessError as e:
        messagebox.showerror("Error", f"Failed to create disk: {e}")
    except Exception as e:
        messagebox.showerror("Error", f"Unexpected error: {e}")

def delete_virtual_disk(disk):
    """Delete the selected disk file."""
    if not disk or disk == "No disks available":
        messagebox.showwarning("Input Error", "No disk selected.")
        return
    path = os.path.join(DISK_DIR, disk)
    try:
        os.remove(path)
        messagebox.showinfo("Success", f"Disk {disk} deleted successfully.")
    except FileNotFoundError:
        messagebox.showerror("Error", f"Disk {disk} not found.")
    except PermissionError:
        messagebox.showerror("Error", f"Cannot delete {disk}: In use or permission denied.")
    except Exception as e:
        messagebox.showerror("Error", f"Failed to delete disk: {e}")

def get_next_vnc_port():
    """Return the next available VNC port (5901, 5902, etc.)."""
    port = 5901
    while port in used_vnc_ports or not is_port_free(port):
        port += 1
        if port > 5950:  # Limit to reasonable range
            raise RuntimeError("No available VNC ports found.")
    used_vnc_ports.append(port)
    return port

def create_virtual_machine(disk, num_cpus, memory):
    """Start a VM with the selected disk and Alpine Linux ISO."""
    disk_path = os.path.join(DISK_DIR, disk)
    try:
        vnc_port = get_next_vnc_port()
        vnc_option = f":{vnc_port-5900}"  # e.g., :1 for 5901, :2 for 5902
        cmd = [
            "qemu-system-x86_64", "-cpu", "qemu64", "-smp", num_cpus,
            "-m", memory, "-hda", disk_path, "-cdrom", ISO_PATH,
            "-boot", "d", "-vnc", vnc_option
        ]
        process = subprocess.Popen(cmd, shell=True)
        vm_processes.append((process, vnc_port))  # Track process and port
        messagebox.showinfo("Success", f"VM started. Connect via VNC to localhost:{vnc_port}")
    except Exception as e:
        if vnc_port in used_vnc_ports:
            used_vnc_ports.remove(vnc_port)  # Free port on failure
        messagebox.showerror("Error", f"Failed to start VM: {e}")

def stop_virtual_machine():
    """Stop the most recently started VM and free its VNC port."""
    if not vm_processes:
        messagebox.showinfo("Info", "No VMs are running.")
        return
    process, vnc_port = vm_processes.pop()
    try:
        process.terminate()
        process.wait(timeout=5)
        used_vnc_ports.remove(vnc_port)  # Free the port
        messagebox.showinfo("Success", f"VM on port {vnc_port} stopped successfully.")
    except subprocess.TimeoutExpired:
        process.kill()
        used_vnc_ports.remove(vnc_port)
        messagebox.showinfo("Success", f"VM on port {vnc_port} forcefully stopped.")
    except Exception as e:
        used_vnc_ports.remove(vnc_port)
        messagebox.showerror("Error", f"Failed to stop VM on port {vnc_port}: {e}")

def get_disks():
    """Return a list of disk files in the disk_images directory."""
    return [f for f in os.listdir(DISK_DIR) if os.path.isfile(os.path.join(DISK_DIR, f))]

def on_closing(window):
    """Handle window close event by stopping all VMs."""
    while vm_processes:
        process, vnc_port = vm_processes.pop()
        try:
            process.terminate()
            process.wait(timeout=5)
        except Exception:
            process.kill()
        finally:
            if vnc_port in used_vnc_ports:
                used_vnc_ports.remove(vnc_port)
    window.destroy()

def create_gui():
    """Create the main GUI with tabs for disk and VM management."""
    window = tk.Tk()
    window.title("Cloud Management System")
    window.geometry("500x400")
    window.configure(bg="#f0f0f0")  # Light gray background

    # Apply modern theme
    style = ttk.Style()
    style.theme_use("clam")
    style.configure("TButton", padding=6, font=("Helvetica", 10))
    style.configure("TLabel", background="#f0f0f0", font=("Helvetica", 10))
    style.configure("TCombobox", font=("Helvetica", 10))
    style.map("TButton", background=[("active", "#d9d9d9")])

    # Title label
    title_label = tk.Label(window, text="Cloud Management System", font=("Helvetica", 16, "bold"), bg="#f0f0f0", fg="#333333")
    title_label.pack(pady=10)

    # Create tabbed interface
    notebook = ttk.Notebook(window)
    notebook.pack(pady=10, padx=10, fill="both", expand=True)

    # Tab 1: Create Virtual Disk
    disk_frame = ttk.Frame(notebook)
    notebook.add(disk_frame, text="Create Disk")

    ttk.Label(disk_frame, text="Disk Format:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
    format_var = tk.StringVar(value="qcow2")
    format_dropdown = ttk.Combobox(disk_frame, textvariable=format_var, values=["qcow2", "raw", "vdi", "vmdk", "vhdx"])
    format_dropdown.grid(row=0, column=1, padx=10, pady=5)

    ttk.Label(disk_frame, text="Size (e.g., 10G):").grid(row=1, column=0, padx=10, pady=5, sticky="e")
    size_entry = ttk.Entry(disk_frame)
    size_entry.grid(row=1, column=1, padx=10, pady=5)
    size_entry.insert(0, "10G")

    ttk.Label(disk_frame, text="Name:").grid(row=2, column=0, padx=10, pady=5, sticky="e")
    name_entry = ttk.Entry(disk_frame)
    name_entry.grid(row=2, column=1, padx=10, pady=5)

    create_button = ttk.Button(disk_frame, text="Create Disk", command=lambda: on_create_disk(format_var, size_entry, name_entry), style="Green.TButton")
    create_button.grid(row=3, column=0, columnspan=2, pady=15)

    # Tab 2: Create Virtual Machine
    vm_frame = ttk.Frame(notebook)
    notebook.add(vm_frame, text="Create VM")

    ttk.Label(vm_frame, text="Select Disk:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
    disk_var = tk.StringVar()
    disk_dropdown = ttk.Combobox(vm_frame, textvariable=disk_var)
    disk_dropdown.grid(row=0, column=1, padx=10, pady=5)

    ttk.Label(vm_frame, text="CPUs (e.g., 1):").grid(row=1, column=0, padx=10, pady=5, sticky="e")
    cpu_entry = ttk.Entry(vm_frame)
    cpu_entry.grid(row=1, column=1, padx=10, pady=5)
    cpu_entry.insert(0, "1")

    ttk.Label(vm_frame, text="Memory (e.g., 512M):").grid(row=2, column=0, padx=10, pady=5, sticky="e")
    memory_entry = ttk.Entry(vm_frame)
    memory_entry.grid(row=2, column=1, padx=10, pady=5)
    memory_entry.insert(0, "512M")

    create_vm_button = ttk.Button(vm_frame, text="Start VM", command=lambda: on_create_vm(disk_var, cpu_entry, memory_entry), style="Green.TButton")
    create_vm_button.grid(row=3, column=0, columnspan=2, pady=10)

    stop_vm_button = ttk.Button(vm_frame, text="Stop VM", command=stop_virtual_machine, style="Red.TButton")
    stop_vm_button.grid(row=4, column=0, columnspan=2, pady=5)

    refresh_button = ttk.Button(vm_frame, text="Refresh Disks", command=lambda: update_disk_dropdown(disk_dropdown, disk_var))
    refresh_button.grid(row=5, column=0, columnspan=2, pady=5)

    # Tab 3: Delete Virtual Disk
    delete_frame = ttk.Frame(notebook)
    notebook.add(delete_frame, text="Delete Disk")

    ttk.Label(delete_frame, text="Select Disk:").grid(row=0, column=0, padx=10, pady=5, sticky="e")
    delete_disk_var = tk.StringVar()
    delete_disk_dropdown = ttk.Combobox(delete_frame, textvariable=delete_disk_var)
    delete_disk_dropdown.grid(row=0, column=1, padx=10, pady=5)

    delete_button = ttk.Button(delete_frame, text="Delete Disk", command=lambda: delete_virtual_disk(delete_disk_var.get()), style="Red.TButton")
    delete_button.grid(row=1, column=0, columnspan=2, pady=15)

    refresh_delete_button = ttk.Button(delete_frame, text="Refresh Disks", command=lambda: update_disk_dropdown(delete_disk_dropdown, delete_disk_var))
    refresh_delete_button.grid(row=2, column=0, columnspan=2, pady=5)

    # Helper functions
    def on_create_disk(format_var, size_entry, name_entry):
        format = format_var.get()
        size = size_entry.get().strip()
        name = name_entry.get().strip()
        if not size or not name:
            messagebox.showwarning("Input Error", "Please fill in all fields.")
            return
        create_virtual_disk(format, size, name)

    def on_create_vm(disk_var, cpu_entry, memory_entry):
        disk = disk_var.get()
        num_cpus = cpu_entry.get().strip()
        memory = memory_entry.get().strip()
        if not disk or not num_cpus or not memory:
            messagebox.showwarning("Input Error", "Please fill in all fields.")
            return
        if disk == "No disks available":
            messagebox.showwarning("No Disks", "Create a disk first.")
            return
        create_virtual_machine(disk, num_cpus, memory)
        update_disk_dropdown(disk_dropdown, disk_var)
        update_disk_dropdown(delete_disk_dropdown, delete_disk_var)

    def update_disk_dropdown(dropdown, var):
        disks = get_disks()
        dropdown["values"] = disks
        if disks:
            var.set(disks[0])
        else:
            var.set("")
            dropdown["values"] = ["No disks available"]

    # Configure button styles
    style.configure("Green.TButton", background="#4CAF50", foreground="white")
    style.map("Green.TButton", background=[("active", "#45a049")])
    style.configure("Red.TButton", background="#f44336", foreground="white")
    style.map("Red.TButton", background=[("active", "#da190b")])

    # Initialize disk dropdowns
    update_disk_dropdown(disk_dropdown, disk_var)
    update_disk_dropdown(delete_disk_dropdown, delete_disk_var)

    window.mainloop()

if __name__ == "__main__":
    # Clean up orphaned QEMU processes and clear ports
    clean_orphaned_processes()
    used_vnc_ports.clear()
    create_gui()