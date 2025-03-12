'use client'
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import useProject from "@/hooks/use-project";
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Image from 'next/image';
import { askQuestion } from './actions';
import { readStreamableValue } from 'ai/rsc';
import MDEditor from '@uiw/react-md-editor';
import CodeReferences from './code-references';
import { api } from '@/trpc/react';
import { toast } from 'sonner';
import useRefetch from '@/hooks/use-refetch';


type FileReference = {
    fileName: string;
    sourceCode: string;
    summary: string;
};

const AskQuestionCard = () => {
    const { project } = useProject();
    const [open, setOpen] = React.useState<boolean>(false);
    const [question, setQuestion] = React.useState<string>('');
    const [loading, setLoading] = React.useState<boolean>(false);
    const [filesReferences, setFilesReferences] = React.useState<FileReference[]>([]);
    const [answer, setAnswer] = React.useState<string>('');

    const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        setAnswer(''); // Reset the answer state
        setFilesReferences([]); // Reset the file references
        e.preventDefault();
        if (!project?.id) return;
        setLoading(true);

        try {
            console.log('Asking question...');
            const { output, filesReferences } = await askQuestion(question, project.id);
            setOpen(true);
            console.log('Question asked.');

            // Set the file references
            if (filesReferences && filesReferences.length > 0) {
                setFilesReferences(filesReferences);
            }

            // Process the streamable output
            console.log(output)
            if (output) {
                for await (const delta of readStreamableValue(output)) {
                    if (delta) {
                        setAnswer((prevAnswer) => prevAnswer + delta);
                    }
                }
                console.log(answer.length)
            }
        } catch (error) {
            console.error('Error asking question:', error);
            setAnswer('An error occurred while processing your question.');
        } finally {
            setLoading(false);
        }
    };

    const saveAnswer = api.project.saveAnswer.useMutation();
    const refetchQuestions = useRefetch()

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className='sm:max-w-[80vw] max-h-[80vh] overflow-y-auto'>
                    <DialogHeader> 
                        <div className='flex items-center gap-2'>
                            <DialogTitle>
                                <Image src='/logo.png' alt='dionysis' width={40} height={40} />
                            </DialogTitle>
                            <Button  disabled={saveAnswer.isPending} variant={'outline'} onClick={() => {
                                saveAnswer.mutate({
                                    projectId: project!.id,
                                    question,
                                    answer,
                                    filesReferences
                                }, {
                                    onSuccess: () => {
                                        toast.success('Answer saved successfully')
                                        refetchQuestions()
                                    },
                                    onError: () => {
                                        toast.error('Failed to save answer')
                                    }   
                                })
                            }}> Save Answer</Button>
                        </div>
                    </DialogHeader>

                    <MDEditor.Markdown source={answer} className='max-w-[70vw] !h-full max-h-[30vh] overflow-scroll' />
                    <div className="h-4"></div>
                    <CodeReferences filesReferences={filesReferences} />
                    <Button type="button" onClick={() => setOpen(false)}>Close</Button>
                </DialogContent>
            </Dialog>
            <Card className='relative col-span-3'>
                <CardHeader>
                    <CardTitle>Ask a question</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <Textarea placeholder="Which files should I edit to change the home page?" value={question} onChange={e => setQuestion(e.target.value)} />
                        <div className="h-4 m-5">
                            <Button type='submit' disabled={loading}>Ask Dionysis</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
};

export default AskQuestionCard;