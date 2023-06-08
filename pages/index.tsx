import React, { useEffect, useState } from 'react';

import Head from 'next/head';
import Image from 'next/image';
import styles from '@/styles/Home.module.css';

// **** Components
import { BackgroundImage1, BackgroundImage2, FooterCon, FooterLink, GenerateQuoteButton, GenerateQuoteButtonText, GradientBackgroundCon, HeartSpan, QuoteGeneratorCon, QuoteGeneratorInnerCon, QuoteGeneratorSubTitle, QuoteGeneratorTitle } from '@/components/QuoteGenerator/QuoteGeneratorElements';
import QuoteGeneratorModal from '@/components/QuoteGenerator';

// **** Assets
import Sun1 from '../assets/sun.png';
import Scroll2 from '../assets/scroll.png';
import { API } from 'aws-amplify';
import { generateAQuote, quotesQueryName } from '@/src/graphql/queries';
import { GraphQLResult } from '@aws-amplify/api-graphql';


// **** Interface for our appsync <> lambda JSON response
interface GenerateAQuoteData {
	generateAQuote: {
		statusCode: number;
		headers: { [ key: string ]: string; };
		body: string;
	};
}

// **** Interface for DynamoDB object
interface UpdateQuoteInfoData {
	id: string;
	queryName: string;
	quotesGenerated: number;
	createdAt: string;
	updatedAt: string;
}

// **** Type guard for our fetch function
function isGraphQLResultForquotesQueryName ( response: any ): response is GraphQLResult<{
	quotesQueryName: {
		items: [ UpdateQuoteInfoData ];
	};
}> {
	return response.data && response.data.quotesQueryName && response.data.quotesQueryName.items;
}


export default function Home () {
	const [ numberOfQuotes, setNumberOfQuotes ] = useState<Number | null>( 0 );
	const [ openGenerator, setOpenGenerator ] = useState( false );
	const [ processingQuote, setProcessingQuote ] = useState( false );
	const [ quoteReceived, setQuoteReceived ] = useState<String | null>( null );

	// _____ Function to fetch our DynamoDB object (quotes generated)
	const updateQuoteInfo = async () => {
		try {
			const response = await API.graphql<UpdateQuoteInfoData>( {
				query: quotesQueryName,
				authMode: "AWS_IAM",
				variables: {
					queryName: "LIVE",
				},
			} );
			console.log( 'response', response );
			// --- setNumberOfQuotes();

			// --- Create type guards
			if ( !isGraphQLResultForquotesQueryName( response ) ) {
				throw new Error( 'Unexpected response from API.graphql' );
			}

			if ( !response.data ) {
				throw new Error( 'Response data is undefined' );
			}

			const receivedNumberOfQuotes = response.data.quotesQueryName.items[ 0 ].quotesGenerated;
			setNumberOfQuotes( receivedNumberOfQuotes );

		} catch ( error ) {
			console.log( 'error getting quote data', error );
		}
	};

	useEffect( () => {
		updateQuoteInfo();
	}, [] );


	// _____ Functions for quote generator modal
	const handleCloseGenerator = () => {
		setOpenGenerator( false );
		setProcessingQuote( false );
		setQuoteReceived( null );
	};

	const handleOpenGenerator = async ( e: React.SyntheticEvent ) => {
		e.preventDefault();
		setOpenGenerator( true );
		setProcessingQuote( true );
		try {
			// --- Run Lambda Function
			const runFunction = "runFunction";
			const runFunctionStringified = JSON.stringify( runFunction );
			const response = await API.graphql<GenerateAQuoteData>( {
				query: generateAQuote,
				authMode: "AWS_IAM",
				variables: {
					input: runFunctionStringified,
				}
			} );
			const responseStringified = JSON.stringify( response );
			const responseReStringified = JSON.stringify( responseStringified );
			const bodyIndex = responseReStringified.indexOf( "body=" ) + 5;
			const bodyAndBase64 = responseReStringified.substring( bodyIndex );
			const bodyArray = bodyAndBase64.split( "," );
			const body = bodyArray[ 0 ];
			console.log( body );
			setQuoteReceived( body );

			// --- End state:
			setProcessingQuote( false );

			// --- Fetch if any new quotes were generated from counter
			updateQuoteInfo();

			// setProcessingQuote(false);
			// setTimeout( () => {
			// 	setProcessingQuote( false );
			// }, 3000 );

		} catch ( error ) {
			console.log( 'error generating quote:', error );
			setProcessingQuote( false );
		}
	};


	return (
		<>
			<Head>
				<title>Inspirational Quote Generator</title>
				<meta name="description" content="A fun project to generate quotes" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<link rel="icon" href="/favicon.ico" />
			</Head>

			{/* Background */}
			<GradientBackgroundCon>

				{/* Quote Generator Modal Pop-Up*/}
				<QuoteGeneratorModal
					open={openGenerator}
					close={handleCloseGenerator}
					processingQuote={processingQuote}
					setProcessingQuote={setProcessingQuote}
					quoteReceived={quoteReceived}
					setQuoteReceived={setQuoteReceived}
				/>

				{/* Quote Generator */}
				<QuoteGeneratorCon>
					<QuoteGeneratorInnerCon>
						<QuoteGeneratorTitle>
							Daily Inspiration Generator
						</QuoteGeneratorTitle>

						<QuoteGeneratorSubTitle style={{ marginTop: "20px" }}>
							Looking for a splash of inspiration? 
							<br/>
							Generate some wisdom below!
							<br/>
							(Provided by <FooterLink href="https://zenquotes.io/" target="_blank" rel="noopener noreferrer"> ZenQuotes</FooterLink>)
						</QuoteGeneratorSubTitle>

						<GenerateQuoteButton
							onClick={handleOpenGenerator}
						>
							<GenerateQuoteButtonText>
								Inspire me!
							</GenerateQuoteButtonText>
						</GenerateQuoteButton>
					</QuoteGeneratorInnerCon>
				</QuoteGeneratorCon>


				{/* Background Images */}
				<BackgroundImage1
					src={Sun1}
					alt="brainbackground1"
				/>
				<BackgroundImage2
					src={Scroll2}
					alt="scrollbackground2"
				/>

				{/* Footer */}
				<FooterCon>
					<>
						Quotes Generated: {numberOfQuotes}
						<br />
						Developed with <HeartSpan>💙</HeartSpan> by <FooterLink href="https://github.com/Nix7amcm" target="_blank" rel="noopener noreferrer"> Nix7amcm⚡ </FooterLink>
					</>
				</FooterCon>

			</GradientBackgroundCon>

		</>
	);
}
