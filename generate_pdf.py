#!/usr/bin/env python3
"""
Script to convert the FastAPI Throttling Implementation Guide to PDF
Requires: pip install markdown weasyprint
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    packages = ['markdown', 'weasyprint']
    
    for package in packages:
        try:
            __import__(package)
            print(f"✅ {package} is already installed")
        except ImportError:
            print(f"📦 Installing {package}...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install', package])

def convert_to_pdf():
    """Convert markdown to PDF"""
    try:
        import markdown
        from weasyprint import HTML, CSS
        
        # Read the markdown file
        with open('FastAPI_Throttling_Implementation_Guide.md', 'r', encoding='utf-8') as f:
            md_content = f.read()
        
        # Convert markdown to HTML
        html_content = markdown.markdown(
            md_content, 
            extensions=['codehilite', 'toc', 'tables', 'fenced_code']
        )
        
        # Add CSS styling
        css_style = '''
        @page {
            size: A4;
            margin: 2cm;
        }
        
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6; 
            color: #333; 
            max-width: 100%;
        }
        
        h1 { 
            color: #1e40af; 
            border-bottom: 3px solid #3b82f6; 
            padding-bottom: 10px;
            page-break-before: always;
            margin-top: 30px;
            font-size: 28px;
        }
        
        h2 { 
            color: #1e40af; 
            border-bottom: 2px solid #60a5fa; 
            padding-bottom: 8px;
            margin-top: 25px;
            font-size: 22px;
        }
        
        h3 { 
            color: #1e40af; 
            margin-top: 20px;
            font-size: 18px;
        }
        
        h4 {
            color: #374151;
            margin-top: 16px;
            font-size: 16px;
        }
        
        code { 
            background-color: #f3f4f6; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 85%;
            color: #dc2626;
        }
        
        pre { 
            background-color: #1f2937; 
            color: #f9fafb;
            border: none;
            border-radius: 8px; 
            padding: 16px; 
            overflow-x: auto;
            margin: 16px 0;
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 14px;
            line-height: 1.4;
        }
        
        pre code {
            background: none;
            padding: 0;
            color: inherit;
            font-size: inherit;
        }
        
        blockquote { 
            border-left: 4px solid #3b82f6; 
            margin: 16px 0; 
            padding-left: 20px; 
            font-style: italic;
            background-color: #f8fafc;
            padding: 16px 20px;
            border-radius: 0 8px 8px 0;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        
        th, td {
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: left;
        }
        
        th {
            background-color: #f3f4f6;
            font-weight: 600;
        }
        
        .toc {
            background-color: #f8fafc;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .highlight {
            background-color: #fef3c7;
            padding: 12px;
            border-radius: 6px;
            margin: 16px 0;
            border-left: 4px solid #f59e0b;
        }
        
        /* Checkmark styling */
        .checkmark {
            color: #059669;
            font-weight: bold;
        }
        
        /* Code block syntax highlighting */
        .codehilite .k { color: #8b5cf6; }  /* keywords */
        .codehilite .s { color: #10b981; }  /* strings */
        .codehilite .c { color: #6b7280; }  /* comments */
        .codehilite .n { color: #f9fafb; }  /* names */
        
        /* Print optimizations */
        @media print {
            body { font-size: 12px; }
            h1 { font-size: 22px; }
            h2 { font-size: 18px; }
            h3 { font-size: 16px; }
            pre { font-size: 11px; }
        }
        '''
        
        # Create complete HTML with enhanced styling
        full_html = f'''
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="utf-8">
            <title>FastAPI User-Based Throttling Implementation Guide</title>
            <style>{css_style}</style>
        </head>
        <body>
            <div class="header">
                <h1 style="text-align: center; margin-top: 0; page-break-before: auto;">
                    FastAPI User-Based Throttling Implementation Guide
                </h1>
                <p style="text-align: center; color: #6b7280; margin-bottom: 40px;">
                    Complete solution using SlowAPI with JWT and Database Token support
                </p>
                <hr style="border: none; height: 2px; background: linear-gradient(to right, #3b82f6, #8b5cf6); margin: 30px 0;">
            </div>
            {html_content}
            <div class="footer" style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
                <p>Generated on {__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
        </body>
        </html>
        '''
        
        # Convert to PDF
        output_file = 'FastAPI_Throttling_Implementation_Guide.pdf'
        
        print("🔄 Converting to PDF...")
        HTML(string=full_html).write_pdf(
            output_file,
            stylesheets=[CSS(string=css_style)]
        )
        
        print(f"✅ PDF generated successfully: {output_file}")
        print(f"📄 File size: {os.path.getsize(output_file) / 1024:.1f} KB")
        
        return output_file
        
    except ImportError as e:
        print(f"❌ Missing required package: {e}")
        print("Please install required packages:")
        print("pip install markdown weasyprint")
        return None
    except Exception as e:
        print(f"❌ Error converting to PDF: {e}")
        return None

def main():
    """Main function"""
    print("📚 FastAPI Throttling Guide PDF Generator")
    print("=" * 50)
    
    # Check if markdown file exists
    if not os.path.exists('FastAPI_Throttling_Implementation_Guide.md'):
        print("❌ Markdown file not found: FastAPI_Throttling_Implementation_Guide.md")
        return
    
    # Install requirements
    install_requirements()
    
    # Convert to PDF
    pdf_file = convert_to_pdf()
    
    if pdf_file:
        print(f"\n🎉 Success! Your PDF guide is ready: {pdf_file}")
        print("\nThe PDF includes:")
        print("• Complete implementation guide")
        print("• Code examples and snippets")
        print("• Configuration options") 
        print("• Troubleshooting section")
        print("• Best practices")
    else:
        print("\n❌ PDF generation failed. Please check the error messages above.")

if __name__ == "__main__":
    main()