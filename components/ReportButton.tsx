'use client';'use client';'use client''use client'



import { useState } from 'react';

import { getBrowserSupabase } from '@/lib/supabase-browser';

import { useState } from 'react';

interface ReportButtonProps {

  contentType: 'comment' | 'article';import { getBrowserSupabase } from '@/lib/supabase-browser';

  contentId: number;

  className?: string;import { useState } from 'react'import { useState } from 'react'

}

interface ReportButtonProps {

export default function ReportButton({ 

  contentType,   contentType: 'comment' | 'article';import { getBrowserSupabase } from '@/lib/supabase-browser'import { getBrowserSupabase } from '@/lib/supabase-browser'

  contentId, 

  className = ''   contentId: number;

}: ReportButtonProps) {

  const [isReporting, setIsReporting] = useState(false);  className?: string;

  const [isSubmitted, setIsSubmitted] = useState(false);

  const supabase = getBrowserSupabase();}



  const handleReport = async () => {interface ReportButtonProps {interface ReportButtonProps {

    console.log('Report button clicked');

    export default function ReportButton({ 

    if (isReporting || isSubmitted) return;

      contentType,   contentType: 'comment' | 'article'  contentType: 'comment' | 'article'

    setIsReporting(true);

  contentId, 

    try {

      const { data: user } = await supabase.auth.getUser();  className = ''   contentId: number  contentId: number

      

      if (!user.user) {}: ReportButtonProps) {

        alert('You must be logged in to report content.');

        return;  const [isReporting, setIsReporting] = useState(false);  className?: string  className?: string

      }

  const [isSubmitted, setIsSubmitted] = useState(false);

      // Simple prompt for reason

      const reasonNum = prompt(  const supabase = getBrowserSupabase();}}

        `Why are you reporting this ${contentType}?\n\n` +

        '1. Spam or unwanted content\n' +

        '2. Harassment or bullying\n' +

        '3. Inappropriate language\n' +  const reportReasons = [

        '4. False information\n' +

        '5. Copyright violation\n' +    'Spam or unwanted content',

        '6. Other\n\n' +

        'Enter 1-6:'    'Harassment or bullying',export default function ReportButton({ export default function ReportButton({ 

      );

    'Inappropriate language',

      if (!reasonNum) {

        console.log('User cancelled report');    'False information',  contentType,   contentType, 

        return;

      }    'Copyright violation',



      const reasons = [    'Other'  contentId,   contentId, 

        'Spam or unwanted content',

        'Harassment or bullying',   ];

        'Inappropriate language',

        'False information',  className = ''   className = '' 

        'Copyright violation',

        'Other'  const handleReport = async () => {

      ];

    console.log('Report button clicked');}: ReportButtonProps) {}: ReportButtonProps) {

      const reasonIndex = parseInt(reasonNum) - 1;

      const selectedReason = reasons[reasonIndex] || 'Other';    



      console.log('Submitting report with reason:', selectedReason);    if (isReporting || isSubmitted) return;  const [isReporting, setIsReporting] = useState(false)  const [isReporting, setIsReporting] = useState(false)



      // Submit report    

      const { data, error } = await supabase

        .from('reports')    setIsReporting(true);  const [isSubmitted, setIsSubmitted] = useState(false)  const [isSubmitted, setIsSubmitted] = useState(false)

        .insert({

          content_type: contentType,

          content_id: contentId,

          reporter_id: user.user.id,    try {  const supabase = getBrowserSupabase()  const supabase = getBrowserSupabase()

          reason: selectedReason,

          status: 'pending'      const { data: user } = await supabase.auth.getUser();

        })

        .select();      



      console.log('Report submission result:', { data, error });      if (!user.user) {



      if (error) {        alert('You must be logged in to report content.');  const reportReasons = [  const reportReasons = [

        console.error('Report error:', error);

        if (error.code === '23505') {        return;

          alert('You have already reported this content.');

        } else {      }    'Spam or unwanted content',    'Spam or unwanted content',

          alert('Failed to submit report. Please try again.');

        }

        return;

      }      // Simple prompt for reason    'Harassment or bullying',    'Harassment or bullying',



      console.log('Report submitted successfully!');      const reason = prompt(

      setIsSubmitted(true);

      alert('Thank you! Your report has been submitted.');        `Why are you reporting this ${contentType}?\n\nSelect a number:\n` +    'Inappropriate language',    'Inappropriate language',

      

      setTimeout(() => {        reportReasons.map((r, i) => `${i + 1}. ${r}`).join('\n') +

        setIsSubmitted(false);

      }, 5000);        '\n\nEnter 1-6:'    'False information',    'False information',

      

    } catch (error) {      );

      console.error('Report error:', error);

      alert('Failed to submit report. Please try again.');    'Copyright violation',    'Copyright violation',

    } finally {

      setIsReporting(false);      if (!reason) {

    }

  };        console.log('User cancelled report');    'Other'    'Other'



  if (isSubmitted) {        return;

    return (

      <span className={`text-xs text-green-600 ${className}`}>      }  ]  ]

        ✓ Reported

      </span>

    );

  }      const reasonIndex = parseInt(reason) - 1;



  return (      const selectedReason = reportReasons[reasonIndex] || 'Other';

    <button

      onClick={handleReport}  const handleReport = async () => {  const handleReport = async (e: React.FormEvent) => {

      disabled={isReporting}

      className={`text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50 ${className}`}      console.log('Submitting report with reason:', selectedReason);

    >

      {isReporting ? 'Reporting...' : 'Report'}    console.log('Report button clicked');    console.log('handleReport called - form submitted');

    </button>

  );      // Submit report

}
      const { data, error } = await supabase        e.preventDefault()

        .from('reports')

        .insert({    if (isReporting || isSubmitted) return;    if (!reason) {

          content_type: contentType,

          content_id: contentId,          console.log('No reason selected, returning early');

          reporter_id: user.user.id,

          reason: selectedReason,    setIsReporting(true);      return;

          status: 'pending'

        })    }

        .select();

    try {

      console.log('Report submission result:', { data, error, contentType, contentId, reason: selectedReason });

      const { data: user } = await supabase.auth.getUser()    console.log('Starting report submission with reason:', reason);

      if (error) {

        console.error('Report error:', error);          setIsReporting(true)

        if (error.code === '23505') {

          alert('You have already reported this content.');      if (!user.user) {

        } else {

          alert('Failed to submit report. Please try again.');        alert('You must be logged in to report content.')    try {

        }

        return;        return      const { data: user } = await supabase.auth.getUser()

      }

      }      

      console.log('Report submitted successfully!');

      setIsSubmitted(true);      if (!user.user) {

      alert('Thank you! Your report has been submitted and will be reviewed by our moderation team.');

            // Simple prompt for reason        alert('You must be logged in to report content.')

      // Auto-reset after 5 seconds

      setTimeout(() => {      const reason = prompt(        return

        setIsSubmitted(false);

      }, 5000);        `Why are you reporting this ${contentType}?\n\nSelect a number:\n` +      }

      

    } catch (error) {        reportReasons.map((r, i) => `${i + 1}. ${r}`).join('\n') +

      console.error('Report error:', error);

      alert('Failed to submit report. Please try again.');        '\n\nEnter 1-6:'      // Insert report into reports table

    } finally {

      setIsReporting(false);      );      const { data, error } = await supabase

    }

  };        .from('reports')



  if (isSubmitted) {      if (!reason) {        .insert({

    return (

      <span className={`text-xs text-green-600 ${className}`}>        console.log('User cancelled report');          content_type: contentType,

        ✓ Reported

      </span>        return;          content_id: contentId,

    );

  }      }          reporter_id: user.user.id,



  return (          reason: reason,

    <button

      onClick={handleReport}      const reasonIndex = parseInt(reason) - 1;          status: 'pending'

      disabled={isReporting}

      className={`text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50 ${className}`}      const selectedReason = reportReasons[reasonIndex] || 'Other';        })

      aria-label={`Report ${contentType}`}

    >        .select()

      {isReporting ? 'Reporting...' : 'Report'}

    </button>      console.log('Submitting report with reason:', selectedReason);

  );

}      console.log('Report submission result:', { data, error, contentType, contentId, reason });

      // Submit report

      const { data, error } = await supabase      if (error) {

        .from('reports')        console.error('Report error:', error)

        .insert({        alert('Failed to submit report. Please try again.')

          content_type: contentType,        return

          content_id: contentId,      }

          reporter_id: user.user.id,

          reason: selectedReason,      console.log('Report submitted successfully!');

          status: 'pending'      setIsSubmitted(true)

        })      setShowForm(false)

        .select()      

      // Auto-hide success message after 3 seconds

      console.log('Report submission result:', { data, error, contentType, contentId, reason: selectedReason });      setTimeout(() => {

        setIsSubmitted(false)

      if (error) {      }, 3000)

        console.error('Report error:', error)      

        if (error.code === '23505') {    } catch (error) {

          alert('You have already reported this content.')      console.error('Report error:', error)

        } else {      alert('Failed to submit report. Please try again.')

          alert('Failed to submit report. Please try again.')    } finally {

        }      setIsReporting(false)

        return    }

      }  }



      console.log('Report submitted successfully!');  if (isSubmitted) {

      setIsSubmitted(true)    return (

      alert('Thank you! Your report has been submitted and will be reviewed by our moderation team.')      <span className={`text-xs text-green-600 ${className}`}>

              ✓ Reported

      // Auto-reset after 5 seconds      </span>

      setTimeout(() => {    )

        setIsSubmitted(false)  }

      }, 5000)

        if (showForm) {

    } catch (error) {    console.log('Rendering modal form, showForm:', showForm);

      console.error('Report error:', error)    

      alert('Failed to submit report. Please try again.')    const modalContent = (

    } finally {      <div 

      setIsReporting(false)        className="fixed top-0 left-0 right-0 bottom-0 bg-red-500 bg-opacity-75 flex items-center justify-center p-4 z-[999999]"

    }        onClick={(e) => {

  }          if (e.target === e.currentTarget) {

            console.log('Modal backdrop clicked, closing');

  if (isSubmitted) {            setShowForm(false);

    return (            setReason('');

      <span className={`text-xs text-green-600 ${className}`}>          }

        ✓ Reported        }}

      </span>      >

    )        <div 

  }          className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl border-4 border-blue-500"

          onClick={(e) => e.stopPropagation()}

  return (        >

    <button          <h3 className="text-lg font-semibold mb-4">

      onClick={handleReport}            Report {contentType}

      disabled={isReporting}          </h3>

      className={`text-xs text-gray-500 hover:text-red-600 hover:underline disabled:opacity-50 ${className}`}          

      aria-label={`Report ${contentType}`}          <form onSubmit={handleReport}>

    >            <div className="space-y-3 mb-4">

      {isReporting ? 'Reporting...' : 'Report'}              {reportReasons.map((reportReason) => (

    </button>                <label key={reportReason} className="flex items-center gap-2">

  )                  <input

}                    type="radio"
                    name="reason"
                    value={reportReason}
                    checked={reason === reportReason}
                    onChange={(e) => setReason(e.target.value)}
                    className="text-blue-600"
                  />
                  <span className="text-sm">{reportReason}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setReason('')
                }}
                className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50 flex-1"
                disabled={isReporting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!reason || isReporting}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex-1"
              >
                {isReporting ? 'Reporting...' : 'Report'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );

    // Use portal to render at document.body level to avoid z-index issues
    return typeof window !== 'undefined' && document.body 
      ? createPortal(modalContent, document.body)
      : modalContent;
  }

  return (
    <>
      <button
        onClick={() => {
          console.log('Report button clicked, opening form modal');
          console.log('showForm before:', showForm);
          setShowForm(true);
          console.log('showForm set to true');
        }}
        className={`text-xs text-gray-500 hover:text-red-600 hover:underline ${className}`}
        aria-label={`Report ${contentType}`}
      >
        Report
      </button>
      
      {/* Debug info */}
      {showForm && (
        <span className="text-xs text-blue-600 ml-1">
          (Modal should be visible)
        </span>
      )}
    </>
  )
}