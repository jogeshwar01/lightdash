import { Comment } from '@lightdash/common';
import { Avatar, Button, Grid, Group, Stack } from '@mantine/core';
import { useForm } from '@mantine/form';
import { Editor, JSONContent } from '@tiptap/react';
import { FC, useMemo, useState } from 'react';
import { useOrganizationUsers } from '../../../hooks/useOrganizationUsers';
import { useSpace } from '../../../hooks/useSpaces';
import { useDashboardContext } from '../../../providers/DashboardProvider';
import { SuggestionsItem } from '../types';
import { getNameInitials } from '../utils';
import { CommentWithMentions } from './CommentWithMentions';

type Props = {
    userName: string;
    onSubmit: (
        text: string,
        html: string,
        mentions: string[],
    ) => Promise<string | undefined>;
    isSubmitting: boolean;
    onCancel?: () => void;
    mode?: 'reply' | 'new';
};

const parseMentions = (data: JSONContent): string[] => {
    const mentions = (data.content || []).flatMap(parseMentions);
    if (data.type === 'mention' && data.attrs?.id) {
        mentions.push(data.attrs.id);
    }

    const uniqueMentions = [...new Set(mentions)];

    return uniqueMentions;
};

export const CommentForm: FC<Props> = ({
    userName,
    onSubmit,
    isSubmitting,
    onCancel,
    mode = 'new',
}) => {
    const projectUuid = useDashboardContext((c) => c.projectUuid);
    const spaceUuid = useDashboardContext((c) => c.dashboard?.spaceUuid);
    const { data: listUsers, isSuccess } = useOrganizationUsers();
    const { data: space } = useSpace(projectUuid ?? '', spaceUuid ?? '');

    const userNames: SuggestionsItem[] = useMemo(() => {
        if (!listUsers || !space?.access) return [];
        return listUsers.reduce<SuggestionsItem[]>((acc, user) => {
            if (!user.isActive) return acc;

            return [
                ...acc,
                {
                    label: `${user.firstName} ${user.lastName}`,
                    id: user.userUuid,
                    // TODO: Reduce look-up time by using a dictionary/Map
                    disabled: !space.access.some(
                        (access) => access.userUuid === user.userUuid,
                    ),
                },
            ];
        }, []);
    }, [listUsers, space?.access]);

    const [shouldClearEditor, setShouldClearEditor] = useState(false);
    const [editor, setEditor] = useState<Editor | null>(null);

    const commentForm = useForm<Pick<Comment, 'replyTo'>>({
        initialValues: {
            replyTo: '',
        },
    });

    const handleSubmit = commentForm.onSubmit(async () => {
        if (editor === null || editor.getText().trim() === '') return;

        onSubmit(
            editor.getText(),
            editor.getHTML(),
            parseMentions(editor.getJSON()),
        );
        setShouldClearEditor(true);
    });

    return (
        <form onSubmit={handleSubmit}>
            <Stack spacing="xs" mt="xs">
                <Grid columns={20}>
                    <Grid.Col span={2}>
                        <Avatar radius="xl" size="sm">
                            {getNameInitials(userName)}
                        </Avatar>
                    </Grid.Col>
                    <Grid.Col span={18} w={mode === 'reply' ? 300 : 350}>
                        {isSuccess && userNames && (
                            <CommentWithMentions
                                suggestions={userNames}
                                shouldClearEditor={shouldClearEditor}
                                setShouldClearEditor={setShouldClearEditor}
                                onUpdate={setEditor}
                            />
                        )}
                    </Grid.Col>
                </Grid>
                <Group position="right" spacing="xs">
                    {onCancel && (
                        <Button
                            compact
                            variant="default"
                            size="xs"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}

                    <Button
                        compact
                        loading={isSubmitting}
                        size="xs"
                        sx={{
                            alignSelf: 'flex-end',
                        }}
                        type="submit"
                    >
                        {mode === 'reply' ? 'Reply' : 'Add comment'}
                    </Button>
                </Group>
            </Stack>
        </form>
    );
};
