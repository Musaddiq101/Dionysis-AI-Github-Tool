'use client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { lucario } from 'react-syntax-highlighter/dist/esm/styles/prism';
import React from 'react'

type Props = {
    filesReferences: {
        fileName: string
        sourceCode: string
    }[]
}

const unescapeCode = (code: string) => {
    return code.replace(/\\n/g, '\n')
               .replace(/\\t/g, '\t')
               .replace(/\\r/g, '\r')
               .replace(/\\"/g, '"')
               .replace(/\\'/g, "'")
               .replace(/\\\\/g, '\\');
  };

const CodeReferences = ({ filesReferences }: Props) => {
    const [tab, setTab] = React.useState(filesReferences[0]?.fileName)
    if (!filesReferences.length) return null

    console.log("Current Tab:", tab);
    console.log("Files References:", filesReferences);

    return (
        <div className="max-w-[70vw]">
            <Tabs defaultValue={tab} value={tab} onValueChange={(value) => setTab(value)}>
                <div className="overflow-scroll scrollbar-hide flex gap-2 bg-gray-200 p-1 rounded-md">
                    {filesReferences.map((file) => (
                        <button
                            key={file.fileName}
                            onClick={() => setTab(file.fileName)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap
                                ${tab === file.fileName
                                    ? "bg-primary text-primary-foreground"
                                    : "text-muted-foreground hover:bg-muted"
                                }`}
                        >
                            {file.fileName}
                        </button>
                    ))}
                </div>
                {filesReferences.map((file) => (
                    <TabsContent key={file.fileName} value={file.fileName} className="max-h-[40vh] overflow-scroll max-w-7xl rounded-md">
                        <SyntaxHighlighter language="typescript" style={lucario}>
                        {unescapeCode(file.sourceCode)}
                        </SyntaxHighlighter>
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    )
}

export default CodeReferences