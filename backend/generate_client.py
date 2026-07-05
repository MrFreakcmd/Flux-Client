import os
import subprocess
import sys

def main():
    # Base paths
    root_dir = os.path.dirname(os.path.abspath(__file__))
    openapi_json = os.path.join(root_dir, "..", "openapi.json")
    output_py = os.path.join(root_dir, "app", "services", "calagopus_models.py")
    
    # Resolve venv generator executable
    if sys.platform == "win32":
        generator_exe = os.path.join(root_dir, "venv", "Scripts", "datamodel-codegen.exe")
    else:
        generator_exe = os.path.join(root_dir, "venv", "bin", "datamodel-codegen")
        
    if not os.path.exists(openapi_json):
        # Check in current dir too
        openapi_json = os.path.join(root_dir, "openapi.json")
        if not os.path.exists(openapi_json):
            print(f"Error: openapi.json not found in {root_dir} or parent.")
            sys.exit(1)
            
    print(f"Generating models from {openapi_json}...")
    print(f"Output target: {output_py}")
    
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_py), exist_ok=True)
    
    # Call datamodel-code-generator
    cmd = [
        generator_exe,
        "--input", openapi_json,
        "--output", output_py,
        "--input-file-type", "openapi",
        "--output-model-type", "pydantic_v2.BaseModel",
        "--target-python-version", "3.12"  # 3.12 is safe for generated code compatibility
    ]
    
    try:
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        print("Success! Generated calagopus_models.py.")
        print(res.stdout)
    except subprocess.CalledProcessError as e:
        print("Error running datamodel-code-generator:")
        print(e.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
